import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { BookOpen, FileText, Landmark, RotateCw, Search, X } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { PocLabView, PocProject } from './components/PocLabView';
import { PortalsView } from './components/PortalsView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ReaderModal } from './components/ReaderModal';
import { ResourceCard } from './components/ResourceCard';
import { SavedView } from './components/SavedView';
import { ActiveTab, TopBar } from './components/TopBar';
import { DISCIPLINES, INSTITUTION_PRESETS, ScienceResource } from './data/libraryCatalog';
import { auth, googleAuthProvider } from './lib/firebase';

const LOCAL_SAVED_KEY = 'tertiary_saved_docs';
const LOCAL_POCS_KEY = 'tertiary_private_pocs';

function loadLocalSaved(): ScienceResource[] {
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalPocs(): PocProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_POCS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [searchInput, setSearchInput] = useState('');
  const [institutionInput, setInstitutionInput] = useState('');
  const [activeQuery, setActiveQuery] = useState(DISCIPLINES[0].starterQuery);
  const [activeInstitution, setActiveInstitution] = useState('');
  const [discipline, setDiscipline] = useState<string>('All');
  const [formatTab, setFormatTab] = useState<'books' | 'papers'>('books');

  const [results, setResults] = useState<{ books: ScienceResource[]; papers: ScienceResource[] }>({
    books: [],
    papers: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [savedItems, setSavedItems] = useState<ScienceResource[]>(() => loadLocalSaved());
  const [privatePocs, setPrivatePocs] = useState<PocProject[]>(() => loadLocalPocs());
  const [linkedPocPaper, setLinkedPocPaper] = useState<{ title: string; url: string } | null>(null);
  const [showcasePocs, setShowcasePocs] = useState<PocProject[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState<boolean>(false);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);

  const [readerResource, setReaderResource] = useState<ScienceResource | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const searchRequestId = useRef(0);

  const persistLocalSaved = useCallback((items: ScienceResource[]) => {
    try {
      localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const persistLocalPocs = useCallback((pocs: PocProject[]) => {
    try {
      localStorage.setItem(LOCAL_POCS_KEY, JSON.stringify(pocs));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const syncWithCloud = useCallback(
    async (firebaseUser: User, pushLocal = false) => {
      setSyncing(true);
      setSyncError(null);
      try {
        const token = await firebaseUser.getIdToken();

        if (pushLocal) {
          const localItems = loadLocalSaved();
          const localPocs = loadLocalPocs();

          const [savedRes, pocRes] = await Promise.all([
            fetch('/api/saved/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ items: localItems }),
            }),
            fetch('/api/poc/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ pocs: localPocs }),
            }),
          ]);

          if (savedRes.ok) {
            const savedData = (await savedRes.json()) as { items?: ScienceResource[] };
            const mergedSaved = savedData.items || [];
            setSavedItems(mergedSaved);
            persistLocalSaved(mergedSaved);
          }

          if (pocRes.ok) {
            const pocData = (await pocRes.json()) as { pocs?: PocProject[] };
            const mergedPocs = pocData.pocs || [];
            setPrivatePocs(mergedPocs);
            persistLocalPocs(mergedPocs);
          }
        } else {
          const [savedRes, pocRes] = await Promise.all([
            fetch('/api/saved', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/poc', { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (savedRes.ok) {
            const savedData = (await savedRes.json()) as { items?: ScienceResource[] };
            const cloudSaved = savedData.items || [];
            setSavedItems(cloudSaved);
            persistLocalSaved(cloudSaved);
          }

          if (pocRes.ok) {
            const pocData = (await pocRes.json()) as { pocs?: PocProject[] };
            const cloudPocs = pocData.pocs || [];
            setPrivatePocs(cloudPocs);
            persistLocalPocs(cloudPocs);
          }
        }
      } catch {
        setSyncError('Cloud sync unavailable right now; using local browser storage.');
      } finally {
        setSyncing(false);
      }
    },
    [persistLocalSaved, persistLocalPocs],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        void syncWithCloud(nextUser, true);
      }
    });
    return () => unsubscribe();
  }, [syncWithCloud]);

  const runSearch = useCallback(async (query: string, targetDiscipline: string, targetInstitution: string) => {
    const requestId = ++searchRequestId.current;
    const cleanInst = targetInstitution.trim();
    setLoading(true);
    setSearchError(null);
    setActiveQuery(query);
    setActiveInstitution(cleanInst);

    try {
      const params = new URLSearchParams({
        q: query,
        discipline: targetDiscipline,
        institution: cleanInst,
      });
      const response = await fetch(`/api/science-search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Search request failed');
      }
      const data = (await response.json()) as {
        books?: ScienceResource[];
        papers?: ScienceResource[];
      };

      if (requestId !== searchRequestId.current) return;

      const books = data.books || [];
      const papers = data.papers || [];
      setResults({ books, papers });

      if (books.length === 0 && papers.length > 0) {
        setFormatTab('papers');
      } else if (books.length > 0) {
        setFormatTab('books');
      }
    } catch {
      if (requestId !== searchRequestId.current) return;
      setSearchError('Unable to reach the open-access catalog right now. Please try again.');
    } finally {
      if (requestId === searchRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void runSearch(DISCIPLINES[0].starterQuery, 'All', '');
  }, [runSearch]);

  const getFallbackQuery = (targetDiscipline: string) => {
    const found = DISCIPLINES.find((d) => d.id === targetDiscipline);
    return found?.starterQuery || DISCIPLINES[0].starterQuery;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim() || getFallbackQuery(discipline);
    void runSearch(trimmed, discipline, institutionInput);
  };

  const handleDisciplineSelect = (discId: string, starterQuery: string) => {
    setDiscipline(discId);
    const queryToUse = searchInput.trim() || starterQuery;
    void runSearch(queryToUse, discId, institutionInput);
  };

  const handleInstitutionPreset = (value: string) => {
    setInstitutionInput(value);
    const queryToUse = searchInput.trim() || getFallbackQuery(discipline);
    void runSearch(queryToUse, discipline, value);
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    setSyncError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch {
      setSyncError('Sign-in was cancelled or blocked. Local bookmarks remain active.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setSyncError(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleToggleSave = async (item: ScienceResource) => {
    const exists = savedItems.some((s) => s.id === item.id);
    const updated = exists
      ? savedItems.filter((s) => s.id !== item.id)
      : [item, ...savedItems];

    setSavedItems(updated);
    persistLocalSaved(updated);

    if (user) {
      try {
        const token = await user.getIdToken();
        if (exists) {
          await fetch(`/api/saved/${encodeURIComponent(item.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          await fetch('/api/saved', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ item }),
          });
        }
      } catch {
        setSyncError('Saved locally; cloud sync will retry on next refresh.');
      }
    }
  };

  const handleSendToPoc = (item: ScienceResource) => {
    setLinkedPocPaper({ title: item.title, url: item.pdfUrl });
    setActiveTab('poc');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePoc = async (poc: PocProject) => {
    const existingIndex = privatePocs.findIndex((p) => p.id === poc.id);
    const updated =
      existingIndex > -1
        ? privatePocs.map((p) => (p.id === poc.id ? { ...poc, isPublic: p.isPublic } : p))
        : [poc, ...privatePocs];

    setPrivatePocs(updated);
    persistLocalPocs(updated);

    if (user) {
      const token = await user.getIdToken();
      const res = await fetch('/api/poc/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ poc }),
      });
      if (!res.ok) {
        throw new Error('Saved locally; cloud sync failed.');
      }
    }
  };

  const handleTogglePocPublish = async (poc: PocProject) => {
    if (!user) return;
    const nextState = !poc.isPublic;
    const token = await user.getIdToken();

    await fetch('/api/poc/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ poc }),
    });

    const res = await fetch('/api/poc/publish', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pocId: poc.id, isPublic: nextState }),
    });

    if (res.ok) {
      const updated = privatePocs.map((p) =>
        p.id === poc.id ? { ...p, isPublic: nextState } : p,
      );
      setPrivatePocs(updated);
      persistLocalPocs(updated);
    }
  };

  const handleDeletePoc = async (pocId: string) => {
    const updated = privatePocs.filter((p) => p.id !== pocId);
    setPrivatePocs(updated);
    persistLocalPocs(updated);

    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch(`/api/poc/${encodeURIComponent(pocId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Keep optimistic local removal
      }
    }
  };

  const loadPublicShowcase = useCallback(async () => {
    setShowcaseLoading(true);
    setShowcaseError(null);
    try {
      const res = await fetch('/api/poc-showcase');
      if (!res.ok) throw new Error('Failed to load showcase');
      const data = (await res.json()) as { showcase?: PocProject[] };
      setShowcasePocs(data.showcase || []);
    } catch {
      setShowcaseError('Unable to load Global Showcase right now.');
    } finally {
      setShowcaseLoading(false);
    }
  }, []);

  const currentList = formatTab === 'books' ? results.books : results.papers;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedItems.length}
        pocCount={privatePocs.length}
        user={user}
        authLoading={authLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24 md:pb-12">
        {activeTab === 'explore' && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 text-balance">
                  Tertiary Science Open Library
                </h1>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  Search peer-reviewed university textbooks and open-access research papers across Medicine, Surgery, Pharmacy, Biotech, Engineering, and Pure Sciences.
                </p>
              </div>
              <PWAInstallButton />
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search pharmacology, CRISPR, surgical anatomy, quantum mechanics..."
                    aria-label="Search textbooks and research papers"
                    className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-[#131C2E] border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm sm:text-base focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[48px] px-5 sm:px-6 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  Search
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="relative flex-1 sm:max-w-md">
                  <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={institutionInput}
                    onChange={(e) => setInstitutionInput(e.target.value)}
                    placeholder="Filter by university or country (e.g. Harvard, Oxford, ETH Zurich)..."
                    aria-label="Filter by university or country"
                    className="w-full min-h-[42px] pl-10 pr-9 rounded-xl bg-[#131C2E] border border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-400 transition-colors"
                  />
                  {institutionInput && (
                    <button
                      type="button"
                      onClick={() => handleInstitutionPreset('')}
                      aria-label="Clear university filter"
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div
                  role="group"
                  aria-label="Quick-pick university repositories"
                  className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
                >
                  {INSTITUTION_PRESETS.map((preset) => {
                    const isSelected =
                      preset.value === ''
                        ? institutionInput.trim() === ''
                        : institutionInput.trim().toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleInstitutionPreset(preset.value)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-sky-400/15 text-sky-300 border-sky-400/50'
                            : 'bg-[#131C2E] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            <div
              role="group"
              aria-label="Filter by scientific discipline"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            >
              {DISCIPLINES.map((item) => {
                const isActive = discipline === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDisciplineSelect(item.id, item.starterQuery)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-sky-400 text-slate-950 border-sky-400'
                        : 'bg-[#131C2E] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Resource format"
                className="grid grid-cols-2 sm:inline-flex gap-1.5 p-1 bg-[#131C2E] border border-slate-800 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={formatTab === 'books'}
                  onClick={() => setFormatTab('books')}
                  className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    formatTab === 'books'
                      ? 'bg-slate-800 text-slate-50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-violet-300" />
                  <span>
                    Textbooks (<span className="font-mono-num">{results.books.length}</span>)
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={formatTab === 'papers'}
                  onClick={() => setFormatTab('papers')}
                  className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    formatTab === 'papers'
                      ? 'bg-slate-800 text-slate-50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0 text-sky-300" />
                  <span>
                    Research Papers (<span className="font-mono-num">{results.papers.length}</span>)
                  </span>
                </button>
              </div>

              <p className="text-xs text-slate-400 truncate">
                Showing results for <span className="text-slate-200 font-medium">{activeQuery}</span>
                {discipline !== 'All' && (
                  <>
                    {' '}in <span className="text-sky-400 font-medium">{discipline}</span>
                  </>
                )}
                {activeInstitution && (
                  <>
                    {' '}from <span className="text-sky-300 font-medium">{activeInstitution}</span>
                  </>
                )}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="h-56 rounded-2xl bg-[#131C2E] border border-slate-800/80 p-5 animate-pulse flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="h-3 w-40 rounded bg-slate-800" />
                      <div className="h-5 w-4/5 rounded bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-800" />
                      <div className="h-12 w-full rounded bg-slate-800/70" />
                    </div>
                    <div className="flex gap-2.5">
                      <div className="h-11 flex-1 rounded-xl bg-slate-800" />
                      <div className="h-11 w-24 rounded-xl bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchError ? (
              <div className="bg-[#131C2E] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
                <p className="text-sm text-slate-300">{searchError}</p>
                <button
                  type="button"
                  onClick={() => void runSearch(activeQuery, discipline, institutionInput)}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Retry Search</span>
                </button>
              </div>
            ) : currentList.length === 0 ? (
              <div className="bg-[#131C2E] border border-slate-800 rounded-2xl p-10 text-center space-y-2">
                <h2 className="text-base font-semibold text-slate-100">
                  No open-access {formatTab === 'books' ? 'textbooks' : 'research papers'} matched this query
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Try clearing the university filter, using broader scientific keywords, or switching to{' '}
                  {formatTab === 'books' ? 'Research Papers' : 'Textbooks'}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentList.map((item) => (
                  <ResourceCard
                    key={item.id}
                    item={item}
                    isSaved={savedItems.some((s) => s.id === item.id)}
                    onRead={setReaderResource}
                    onToggleSave={handleToggleSave}
                    onSendToPoc={handleSendToPoc}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'saved' && (
          <SavedView
            savedItems={savedItems}
            user={user}
            authLoading={authLoading}
            syncing={syncing}
            syncError={syncError}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onRefreshSync={() => {
              if (user) void syncWithCloud(user, false);
            }}
            onRead={setReaderResource}
            onToggleSave={handleToggleSave}
            onSendToPoc={handleSendToPoc}
          />
        )}

        {activeTab === 'poc' && (
          <PocLabView
            linkedPaper={linkedPocPaper}
            onClearLinkedPaper={() => setLinkedPocPaper(null)}
            onSetLinkedPaper={setLinkedPocPaper}
            privatePocs={privatePocs}
            showcasePocs={showcasePocs}
            showcaseLoading={showcaseLoading}
            showcaseError={showcaseError}
            user={user}
            onSignIn={handleSignIn}
            onSavePoc={handleSavePoc}
            onTogglePublish={handleTogglePocPublish}
            onDeletePoc={handleDeletePoc}
            onLoadShowcase={() => void loadPublicShowcase()}
          />
        )}

        {activeTab === 'portals' && <PortalsView />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedItems.length}
      />

      <ReaderModal
        resource={readerResource}
        onClose={() => setReaderResource(null)}
      />

      <OfflineIndicator />
    </div>
  );
}
