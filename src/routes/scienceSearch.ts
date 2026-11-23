import express from 'express';
import {
  getSavedDocsForUser,
  removeSavedDocForUser,
  saveDocForUser,
  ScienceResourceInput,
} from '../db/savedDocs.ts';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = express.Router();

export interface ScienceResource {
  id: string;
  type: 'book' | 'paper';
  source: string;
  institution: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  pdfUrl: string;
  isPdfDirect?: boolean;
}

let openStaxCache: { expiresAt: number; items: any[] } | null = null;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDOAB(query: string, institution: string, limit = 6): Promise<ScienceResource[]> {
  try {
    const combined = institution ? `${query} ${institution}` : query;
    const url = `https://directory.doabooks.org/rest/search?query=${encodeURIComponent(combined)}&expand=metadata,bitstreams&limit=${limit}`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'OpenTertiaryScienceLibrary/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any[];
    return (data || [])
      .map((book) => {
        const getMeta = (key: string) => book.metadata?.find((m: any) => m.key === key)?.value;
        const pdfBitstream = book.bitstreams?.find((b: any) => b.mimeType === 'application/pdf');
        const pdfUrl = pdfBitstream
          ? `https://directory.doabooks.org${pdfBitstream.retrieveLink}`
          : book.handle
            ? `https://directory.doabooks.org/handle/${book.handle}`
            : '';
        if (!pdfUrl) return null;
        const publisher = getMeta('dc.publisher') || getMeta('dc.contributor.other') || 'University Press';
        return {
          id: `doab-${book.uuid}`,
          type: 'book' as const,
          source: 'DOAB Textbooks',
          institution: publisher,
          title: book.name || getMeta('dc.title') || 'Untitled Textbook',
          authors: getMeta('dc.contributor.author') || getMeta('dc.creator') || 'University Press',
          year: String(getMeta('dc.date.issued') || 'N/A').slice(0, 4),
          abstract: stripHtml(getMeta('dc.description.abstract') || 'Open-access university textbook.'),
          pdfUrl,
          isPdfDirect: Boolean(pdfBitstream),
        };
      })
      .filter(Boolean) as ScienceResource[];
  } catch {
    return [];
  }
}

async function fetchOpenStax(query: string): Promise<ScienceResource[]> {
  try {
    if (!openStaxCache || openStaxCache.expiresAt < Date.now()) {
      const url =
        'https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=title,slug,description,book_subjects&limit=150';
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: any[] };
      openStaxCache = {
        expiresAt: Date.now() + 30 * 60 * 1000,
        items: data.items || [],
      };
    }

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

    const scored = openStaxCache.items
      .map((book) => {
        const subjects = (book.book_subjects || []).map((s: any) => s.subject_name || '').join(' ');
        const desc = stripHtml(book.description || '');
        const title = book.title || '';
        const haystack = `${title} ${subjects} ${desc}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (title.toLowerCase().includes(term)) score += 3;
          else if (subjects.toLowerCase().includes(term)) score += 2;
          else if (haystack.includes(term)) score += 1;
        }
        return { book, desc, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored.map(({ book, desc }) => {
      const slug = book.meta?.slug || book.slug;
      const htmlUrl = book.meta?.html_url || `https://openstax.org/details/books/${slug}`;
      const pubDate = book.meta?.first_published_at ? String(book.meta.first_published_at).slice(0, 4) : 'Current';
      return {
        id: `openstax-${book.id}`,
        type: 'book',
        source: 'OpenStax',
        institution: 'Rice University (USA)',
        title: book.title || 'OpenStax Textbook',
        authors: 'OpenStax · Rice University',
        year: pubDate,
        abstract: desc || 'Peer-reviewed open university textbook with interactive web and PDF editions.',
        pdfUrl: htmlUrl,
        isPdfDirect: false,
      };
    });
  } catch {
    return [];
  }
}

async function fetchOpenTextbookLibrary(
  query: string,
  institution: string,
  limit = 6,
): Promise<ScienceResource[]> {
  try {
    const combined = institution ? `${query} ${institution}` : query;
    const url = `https://open.umn.edu/opentextbooks/textbooks.json?q=${encodeURIComponent(combined)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const payload = (await res.json()) as { data?: any[] };
    return (payload.data || []).slice(0, limit).map((book) => {
      const authors =
        (book.contributors || [])
          .map((c: any) => [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' '))
          .filter(Boolean)
          .join(', ') || 'Open Textbook Library';
      const pdfFormat = (book.formats || []).find((f: any) => f.type === 'PDF' && f.url);
      const onlineFormat = (book.formats || []).find((f: any) => f.type === 'Online' && f.url);
      const targetUrl = pdfFormat?.url || onlineFormat?.url || book.url;
      return {
        id: `otl-${book.id}`,
        type: 'book' as const,
        source: 'Open Textbook Library',
        institution: institution || 'University of Minnesota (USA)',
        title: book.title || 'Untitled Textbook',
        authors,
        year: book.copyright_year ? String(book.copyright_year) : 'N/A',
        abstract: stripHtml(book.description || 'Peer-reviewed open-access university textbook.'),
        pdfUrl: targetUrl,
        isPdfDirect: Boolean(targetUrl && targetUrl.toLowerCase().endsWith('.pdf')),
      };
    });
  } catch {
    return [];
  }
}

async function fetchNCBIBookshelf(
  query: string,
  institution: string,
  limit = 5,
): Promise<ScienceResource[]> {
  try {
    const combined = institution ? `${query} ${institution}` : query;
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=books&term=${encodeURIComponent(combined)}&retmax=${limit}&retmode=json`;
    const searchRes = await fetchWithTimeout(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } };
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=books&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetchWithTimeout(summaryUrl);
    if (!summaryRes.ok) return [];
    const summaryData = (await summaryRes.json()) as { result?: Record<string, any> };
    const resultObj = summaryData.result || {};

    return ids
      .map((id) => {
        const item = resultObj[id];
        if (!item) return null;
        const bookInfoXml = String(item.bookinfo || '');
        const bookTitleMatch = bookInfoXml.match(/role="source"[^>]*><Title>([\s\S]*?)<\/Title>/);
        const pubMatch = bookInfoXml.match(/<PublicationStatement>([\s\S]*?)<\/PublicationStatement>/);
        const chapterTitle = item.title && item.title !== 'ANNOTATED BIBLIOGRAPHY' ? item.title : '';
        const parentBookTitle = bookTitleMatch ? stripHtml(bookTitleMatch[1]) : '';
        const fullTitle =
          chapterTitle && parentBookTitle && chapterTitle !== parentBookTitle
            ? `${parentBookTitle}: ${chapterTitle}`
            : parentBookTitle || chapterTitle || 'NCBI Bookshelf Reference';
        const accession = item.rid || item.chapteraccessionid || item.accessionid || item.bookaccessionid;
        if (!accession) return null;
        const publisherText = pubMatch ? stripHtml(pubMatch[1]) : 'US National Library of Medicine';
        return {
          id: `ncbi-${id}`,
          type: 'book' as const,
          source: 'NCBI Bookshelf',
          institution: publisherText,
          title: fullTitle,
          authors: publisherText,
          year: item.pubdate ? String(item.pubdate).slice(0, 4) : 'N/A',
          abstract: `Authoritative clinical and biomedical textbook section indexed on NCBI Bookshelf (${item.bookaccessionid || accession}).`,
          pdfUrl: `https://www.ncbi.nlm.nih.gov/books/${accession}/`,
          isPdfDirect: false,
        };
      })
      .filter(Boolean) as ScienceResource[];
  } catch {
    return [];
  }
}

async function fetchEuropePMC(
  query: string,
  institution: string,
  limit = 8,
): Promise<ScienceResource[]> {
  try {
    const fullQuery = institution
      ? `(${query}) AND AFF:"${institution}" AND OPEN_ACCESS:y`
      : `${query} AND OPEN_ACCESS:y`;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(fullQuery)}&format=json&resultType=core&pageSize=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { resultList?: { result?: any[] } };
    return (data.resultList?.result || [])
      .map((item) => {
        const pdfObj = item.fullTextUrlList?.fullTextUrl?.find(
          (u: any) => u.documentStyle === 'pdf' && u.availabilityCode === 'OA',
        );
        const webObj = item.fullTextUrlList?.fullTextUrl?.[0];
        const fallbackPdf = item.pmcid ? `https://europepmc.org/articles/${item.pmcid}?pdf=render` : null;
        const pdfUrl = pdfObj?.url || fallbackPdf || webObj?.url;
        if (!pdfUrl) return null;
        const journal =
          item.journalTitle ||
          item.bookOrReportDetails?.publisher ||
          item.affiliation ||
          'Biomedical Open Access';
        return {
          id: `epmc-${item.id}`,
          type: 'paper' as const,
          source: 'PubMed / Europe PMC',
          institution: institution ? `${institution} · ${journal}` : journal,
          title: stripHtml(item.title || 'Untitled Article'),
          authors: item.authorString || 'PubMed Contributors',
          year: item.pubYear ? String(item.pubYear) : 'N/A',
          abstract: stripHtml(item.abstractText || 'Open-access biomedical full-text article.'),
          pdfUrl,
          isPdfDirect: Boolean(pdfObj?.url || fallbackPdf),
        };
      })
      .filter(Boolean) as ScienceResource[];
  } catch {
    return [];
  }
}

async function fetchArxiv(query: string, institution: string, limit = 8): Promise<ScienceResource[]> {
  try {
    const combined = institution ? `${query} ${institution}` : query;
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(combined)}&start=0&max_results=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);
    return entries
      .map((entry) => {
        const extract = (tag: string) => {
          const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
          return match ? match[1].replace(/\s+/g, ' ').trim() : '';
        };
        const rawId = extract('id');
        const arxivId = (rawId.split('/abs/')[1] || rawId).trim();
        if (!arxivId) return null;
        const authors =
          [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1].trim()).join(', ') || 'arXiv Authors';
        const published = extract('published').slice(0, 4) || 'N/A';
        return {
          id: `arxiv-${arxivId}`,
          type: 'paper' as const,
          source: 'arXiv',
          institution: institution ? `${institution} · arXiv` : 'Cornell arXiv Global',
          title: extract('title') || 'Untitled Preprint',
          authors,
          year: published,
          abstract: extract('summary') || 'Open-access scientific preprint.',
          pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          isPdfDirect: true,
        };
      })
      .filter(Boolean) as ScienceResource[];
  } catch {
    return [];
  }
}

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    sources: ['OpenStax', 'Open Textbook Library', 'NCBI Bookshelf', 'DOAB', 'Europe PMC', 'arXiv'],
  });
});

router.get('/science-search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const discipline = String(req.query.discipline || 'All').trim();
  const instFilter = String(req.query.institution || '').trim();

  if (!q) {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }

  const targetedQuery = discipline && discipline !== 'All' ? `${q} ${discipline}` : q;
  const isClinicalDiscipline = ['Medicine', 'Surgery', 'Pharmacy', 'Biotechnology'].includes(discipline);

  const [openstaxRes, otlRes, doabRes, ncbiRes, epmcRes, arxivRes] = await Promise.allSettled([
    fetchOpenStax(targetedQuery),
    fetchOpenTextbookLibrary(targetedQuery, instFilter),
    fetchDOAB(targetedQuery, instFilter),
    isClinicalDiscipline || discipline === 'All'
      ? fetchNCBIBookshelf(targetedQuery, instFilter)
      : Promise.resolve([]),
    fetchEuropePMC(targetedQuery, instFilter),
    fetchArxiv(targetedQuery, instFilter),
  ]);

  const rawBooks = [
    ...(openstaxRes.status === 'fulfilled' ? openstaxRes.value : []),
    ...(otlRes.status === 'fulfilled' ? otlRes.value : []),
    ...(ncbiRes.status === 'fulfilled' ? ncbiRes.value : []),
    ...(doabRes.status === 'fulfilled' ? doabRes.value : []),
  ];

  const rawPapers = [
    ...(epmcRes.status === 'fulfilled' ? epmcRes.value : []),
    ...(arxivRes.status === 'fulfilled' ? arxivRes.value : []),
  ];

  const dedupe = (list: ScienceResource[]) => {
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = `${item.title.toLowerCase()}::${item.source}`;
      if (seen.has(key) || !item.pdfUrl) return false;
      seen.add(key);
      return true;
    });
  };

  let books = dedupe(rawBooks);
  const papers = dedupe(rawPapers);

  if (instFilter) {
    books = books.filter(
      (b) => b.source !== 'OpenStax' || b.institution.toLowerCase().includes(instFilter.toLowerCase()),
    );
  }

  res.json({
    query: q,
    discipline,
    institution: instFilter || 'Global',
    counts: { books: books.length, papers: papers.length },
    books,
    papers,
  });
});

router.get('/saved', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await getSavedDocsForUser(req.user!.uid);
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load synced reading list' });
  }
});

router.post('/saved', requireAuth, async (req: AuthRequest, res) => {
  const item = req.body?.item as ScienceResourceInput | undefined;
  if (!item?.id || !item?.title || !item?.pdfUrl) {
    return res.status(400).json({ error: 'Valid item payload (id, title, pdfUrl) is required' });
  }

  try {
    await saveDocForUser(req.user!.uid, req.user!.email || 'student@library.local', item);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save bookmark' });
  }
});

router.post('/saved/sync', requireAuth, async (req: AuthRequest, res) => {
  const items = Array.isArray(req.body?.items) ? (req.body.items as ScienceResourceInput[]) : [];
  try {
    for (const item of items) {
      if (item?.id && item?.title && item?.pdfUrl) {
        await saveDocForUser(req.user!.uid, req.user!.email || 'student@library.local', item);
      }
    }
    const syncedItems = await getSavedDocsForUser(req.user!.uid);
    res.json({ items: syncedItems });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to synchronize reading list' });
  }
});

router.delete('/saved/:docId', requireAuth, async (req: AuthRequest, res) => {
  const docId = decodeURIComponent(String(req.params.docId || ''));
  if (!docId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    await removeSavedDocForUser(req.user!.uid, docId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove bookmark' });
  }
});

export default router;
