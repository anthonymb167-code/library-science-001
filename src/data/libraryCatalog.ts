export interface ScienceResource {
  id: string;
  type: 'book' | 'paper';
  source: string;
  institution?: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  pdfUrl: string;
  isPdfDirect?: boolean;
}

export interface DisciplineOption {
  id: string;
  label: string;
  starterQuery: string;
}

export const DISCIPLINES: DisciplineOption[] = [
  { id: 'All', label: 'All Sciences', starterQuery: 'clinical medicine pharmacology engineering' },
  { id: 'Medicine', label: 'Medicine', starterQuery: 'clinical internal medicine' },
  { id: 'Surgery', label: 'Surgery', starterQuery: 'surgical anatomy procedures' },
  { id: 'Pharmacy', label: 'Pharmacy', starterQuery: 'pharmacology therapeutics' },
  { id: 'Biotechnology', label: 'Biotech', starterQuery: 'genetic engineering molecular biology' },
  { id: 'Engineering', label: 'Engineering', starterQuery: 'thermodynamics electrical engineering' },
  { id: 'Computer Science', label: 'Tech & CS', starterQuery: 'algorithms machine learning' },
  { id: 'Physics', label: 'Physics & Math', starterQuery: 'quantum mechanics astrophysics' },
];

export interface InstitutionPreset {
  label: string;
  value: string;
  country?: string;
}

export const INSTITUTION_PRESETS: InstitutionPreset[] = [
  { label: 'All World', value: '' },
  { label: 'Harvard', value: 'Harvard', country: 'USA' },
  { label: 'Stanford', value: 'Stanford', country: 'USA' },
  { label: 'Oxford', value: 'Oxford', country: 'UK' },
  { label: 'Cambridge', value: 'Cambridge', country: 'UK' },
  { label: 'ETH Zurich', value: 'ETH Zurich', country: 'Switzerland' },
  { label: 'Makerere', value: 'Makerere', country: 'Uganda' },
];

export type PortalCategory =
  | 'All'
  | 'University Repositories'
  | 'Clinical & Pharmacy'
  | 'Textbooks & Syllabi'
  | 'Papers & Directories';

export interface AcademicPortal {
  id: string;
  name: string;
  category: Exclude<PortalCategory, 'All'>;
  accessType: string;
  description: string;
  url: string;
}

export const ACADEMIC_PORTALS: AcademicPortal[] = [
  {
    id: 'mit-ocw',
    name: 'MIT OpenCourseWare (USA)',
    category: 'University Repositories',
    accessType: 'Lecture Notes & Syllabi',
    description:
      'Full university lecture notes, exams, problem sets, and free textbooks across engineering, computer science, and hard sciences.',
    url: 'https://ocw.mit.edu/',
  },
  {
    id: 'harvard-dash',
    name: 'Harvard DASH Repository (USA)',
    category: 'University Repositories',
    accessType: 'Institutional Repository',
    description:
      'Digital Access to Scholarship at Harvard: open-access scholarly articles and scientific research directly from Harvard University.',
    url: 'https://dash.harvard.edu/',
  },
  {
    id: 'harvard-pll',
    name: 'Harvard Online Free Courses (USA)',
    category: 'University Repositories',
    accessType: 'Open Courseware',
    description:
      'Free online university courses, lectures, and study materials across medicine, data science, and physical sciences.',
    url: 'https://pll.harvard.edu/',
  },
  {
    id: 'eth-zurich',
    name: 'ETH Zurich Research Collection (Switzerland)',
    category: 'University Repositories',
    accessType: 'Institutional Repository',
    description:
      'Free engineering, physics, chemistry, and biotechnology publications from Switzerland’s premier technical university.',
    url: 'https://www.research-collection.ethz.ch/',
  },
  {
    id: 'oxford-ora',
    name: 'Oxford University Research Archive (UK)',
    category: 'University Repositories',
    accessType: 'Institutional Repository',
    description:
      'Open-access publications, doctoral theses, and peer-reviewed scientific papers from the University of Oxford.',
    url: 'https://ora.ox.ac.uk/',
  },
  {
    id: 'ncbi-bookshelf',
    name: 'NCBI Bookshelf',
    category: 'Clinical & Pharmacy',
    accessType: 'Web & Mobile Browser',
    description:
      'Run by the US National Library of Medicine, offering hundreds of authoritative full-length textbooks on clinical medicine, surgery, pharmacology, toxicology, and molecular biology.',
    url: 'https://www.ncbi.nlm.nih.gov/books/',
  },
  {
    id: 'merck-manual',
    name: 'Merck Manual Professional',
    category: 'Clinical & Pharmacy',
    accessType: 'Free Mobile App & Web',
    description:
      'Gold-standard clinical reference covering internal medicine, surgical procedures, pediatrics, and clinical pharmacology in deep university-level detail.',
    url: 'https://www.merckmanuals.com/professional',
  },
  {
    id: 'medscape',
    name: 'Medscape Clinical & Drug Reference',
    category: 'Clinical & Pharmacy',
    accessType: 'Free Mobile App & Web',
    description:
      'Comprehensive drug interaction checker, dosing calculators, disease pathophysiology, and step-by-step surgical and clinical procedure guides.',
    url: 'https://reference.medscape.com/',
  },
  {
    id: 'health-open-access',
    name: 'Health Open Access E-Library',
    category: 'Clinical & Pharmacy',
    accessType: 'Web Archive',
    description:
      'Curated portal for medical, nursing, and health science students providing open-access clinical guidelines and medical databases.',
    url: 'https://www.who.int/publications',
  },
  {
    id: 'openstax',
    name: 'OpenStax University Textbooks',
    category: 'Textbooks & Syllabi',
    accessType: 'Free Mobile App & Web',
    description:
      'Peer-reviewed foundational university textbooks across Biology, Chemistry, Physics, Astronomy, Anatomy, and Calculus with offline mobile reading.',
    url: 'https://openstax.org/subjects',
  },
  {
    id: 'libretexts',
    name: 'LibreTexts All-Disciplines Library',
    category: 'Textbooks & Syllabi',
    accessType: 'Modular Web Textbooks',
    description:
      'One of the largest open-access textbook libraries worldwide covering Pharmacy, Biotech, Mechanical/Civil/Electrical Engineering, Math, and Geosciences.',
    url: 'https://libretexts.org/',
  },
  {
    id: 'open-textbook-library',
    name: 'Open Textbook Library (UMN)',
    category: 'Textbooks & Syllabi',
    accessType: 'Downloadable PDFs',
    description:
      'Hosted by the University of Minnesota, featuring peer-reviewed, downloadable PDF textbooks in Biotechnology, Biochemistry, Microbiology, and Engineering.',
    url: 'https://open.umn.edu/opentextbooks',
  },
  {
    id: 'nap',
    name: 'National Academies Press',
    category: 'Textbooks & Syllabi',
    accessType: 'Free PDF Downloads',
    description:
      'Over 10,000 free downloadable PDF books published by the National Academies of Sciences, Engineering, and Medicine.',
    url: 'https://nap.nationalacademies.org/',
  },
  {
    id: 'open-library',
    name: 'Internet Archive / Open Library',
    category: 'Textbooks & Syllabi',
    accessType: 'Digital Lending Library',
    description:
      'Global digital library to freely borrow standard reference editions including Gray’s Anatomy, Harrison’s Internal Medicine, and Lehninger Biochemistry.',
    url: 'https://openlibrary.org/',
  },
  {
    id: 'pmc',
    name: 'PubMed Central (PMC)',
    category: 'Papers & Directories',
    accessType: 'Full-Text Journal Archive',
    description:
      'Massive free full-text archive of biomedical, surgical, biotechnology, genetic engineering, and life sciences journal literature.',
    url: 'https://pmc.ncbi.nlm.nih.gov/',
  },
  {
    id: 'arxiv',
    name: 'arXiv Pre-Print Archive',
    category: 'Papers & Directories',
    accessType: 'Open Pre-Print Server',
    description:
      'Premier global repository for free pre-print research papers in Physics, Mathematics, Computer Science, AI, Electrical Engineering, and Quantitative Biology.',
    url: 'https://arxiv.org/',
  },
  {
    id: 'biorxiv-medrxiv',
    name: 'bioRxiv & medRxiv',
    category: 'Papers & Directories',
    accessType: 'Life Sciences Pre-Prints',
    description:
      'Primary global servers for cutting-edge research papers in synthetic biology, biotechnology, genetics, and clinical medicine ahead of journal publication.',
    url: 'https://www.biorxiv.org/',
  },
  {
    id: 'doaj',
    name: 'Directory of Open Access Journals (DOAJ)',
    category: 'Papers & Directories',
    accessType: '20,000+ Peer-Reviewed Journals',
    description:
      'Indexes over 20,000 peer-reviewed open-access scientific journals across medicine, surgery, pharmacy, technology, and pure sciences.',
    url: 'https://doaj.org/',
  },
  {
    id: 'semantic-scholar',
    name: 'Semantic Scholar',
    category: 'Papers & Directories',
    accessType: 'Citation Graph & PDF Finder',
    description:
      'Scientific literature search tool with citation graphs, direct open-access PDF links, and concise paper summaries.',
    url: 'https://www.semanticscholar.org/',
  },
];
