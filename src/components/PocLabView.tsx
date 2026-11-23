import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  BookmarkPlus,
  Check,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe,
  Link2,
  Lock,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

export interface PocProject {
  id: string;
  title: string;
  domain: string;
  linkedPaperTitle: string;
  linkedPaperUrl: string;
  hypothesis: string;
  parameters: string;
  auditReport: string;
  isPublic?: boolean;
  updatedAt?: string;
}

export const POC_DOMAINS = [
  'Medicine & Surgery',
  'Pharmacy & Therapeutics',
  'Biotechnology & Genetics',
  'Space & Aerospace Systems',
  'Energy & Engineering',
  'Computing & AI',
];

interface PocLabViewProps {
  linkedPaper: { title: string; url: string } | null;
  onClearLinkedPaper: () => void;
  onSetLinkedPaper: (paper: { title: string; url: string } | null) => void;
  privatePocs: PocProject[];
  showcasePocs: PocProject[];
  showcaseLoading: boolean;
  showcaseError: string | null;
  user: User | null;
  onSignIn: () => void;
  onSavePoc: (poc: PocProject) => Promise<void>;
  onTogglePublish: (poc: PocProject) => Promise<void>;
  onDeletePoc: (pocId: string) => Promise<void>;
  onLoadShowcase: () => void;
}

export const PocLabView: React.FC<PocLabViewProps> = ({
  linkedPaper,
  onClearLinkedPaper,
  onSetLinkedPaper,
  privatePocs,
  showcasePocs,
  showcaseLoading,
  showcaseError,
  user,
  onSignIn,
  onSavePoc,
  onTogglePublish,
  onDeletePoc,
  onLoadShowcase,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState(POC_DOMAINS[0]);
  const [hypothesis, setHypothesis] = useState('');
  const [parameters, setParameters] = useState('');
  const [auditReport, setAuditReport] = useState('');
  const [auditMode, setAuditMode] = useState<'gemini' | 'deterministic' | null>(null);

  const [auditing, setAuditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [listView, setListView] = useState<'mine' | 'showcase'>('mine');
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [expandedShowcaseId, setExpandedShowcaseId] = useState<string | null>(null);

  const runAudit = async (offlineFallback = false) => {
    const cleanTitle = title.trim();
    const cleanHypothesis = hypothesis.trim();
    if (!cleanTitle || !cleanHypothesis) {
      setFormNotice({
        type: 'error',
        text: 'Please enter both an Invention Title and Core Scientific Mechanism before running an audit.',
      });
      return;
    }

    setFormNotice(null);
    setAuditError(null);
    setAuditing(true);

    try {
      const res = await fetch('/api/poc/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          domain,
          hypothesis: cleanHypothesis,
          parameters: parameters.trim(),
          linkedPaperTitle: linkedPaper?.title || '',
          offlineFallback,
        }),
      });

      const data = (await res.json()) as {
        report?: string;
        mode?: 'gemini' | 'deterministic';
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Feasibility audit failed.');
      }

      setAuditReport(data.report || '');
      setAuditMode(data.mode || null);
    } catch (err: any) {
      setAuditError(err.message || 'Unable to run feasibility audit right now.');
    } finally {
      setAuditing(false);
    }
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    const cleanHypothesis = hypothesis.trim();
    if (!cleanTitle || !cleanHypothesis) {
      setFormNotice({
        type: 'error',
        text: 'Enter an Invention Title and Core Mechanism to save a private blueprint.',
      });
      return;
    }

    setFormNotice(null);
    setSaving(true);
    try {
      const poc: PocProject = {
        id: editingId || `poc-${Date.now()}`,
        title: cleanTitle,
        domain,
        linkedPaperTitle: linkedPaper?.title || '',
        linkedPaperUrl: linkedPaper?.url || '',
        hypothesis: cleanHypothesis,
        parameters: parameters.trim(),
        auditReport,
        isPublic: false,
      };
      await onSavePoc(poc);
      setEditingId(poc.id);
      setFormNotice({
        type: 'success',
        text: user
          ? 'Saved privately to your browser and synced to your account.'
          : 'Saved privately in this browser. Sign in to sync across devices.',
      });
    } catch (err: any) {
      setFormNotice({
        type: 'error',
        text: err.message || 'Could not save blueprint.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadIntoEditor = (poc: PocProject) => {
    setEditingId(poc.id);
    setTitle(poc.title);
    setDomain(poc.domain);
    setHypothesis(poc.hypothesis);
    setParameters(poc.parameters);
    setAuditReport(poc.auditReport);
    setAuditMode(null);
    setFormNotice(null);
    setAuditError(null);
    if (poc.linkedPaperTitle) {
      onSetLinkedPaper({ title: poc.linkedPaperTitle, url: poc.linkedPaperUrl });
    } else {
      onClearLinkedPaper();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewBlueprint = () => {
    setEditingId(null);
    setTitle('');
    setDomain(POC_DOMAINS[0]);
    setHypothesis('');
    setParameters('');
    setAuditReport('');
    setAuditMode(null);
    setFormNotice(null);
    setAuditError(null);
    onClearLinkedPaper();
  };

  const handleCopyDossier = async () => {
    if (!auditReport) return;
    const text = `PROOF OF CONCEPT: ${title.trim()}\nDOMAIN: ${domain}\n${
      linkedPaper?.title ? `LITERATURE: ${linkedPaper.title}\n` : ''
    }\n${auditReport}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormNotice({ type: 'error', text: 'Clipboard access was blocked by the browser.' });
    }
  };

  const handleSwitchList = (view: 'mine' | 'showcase') => {
    setListView(view);
    if (view === 'showcase') {
      onLoadShowcase();
    }
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 text-balance">
            Proof-of-Concept Engine
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Turn open-access scientific literature into structured prototypes and stress-test physical, biochemical, or clinical feasibility.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 shrink-0">
          <Lock className="w-3.5 h-3.5" />
          <span>Private by Default</span>
        </div>
      </div>

      <div className="bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-200">
            {editingId ? 'Editing Saved Blueprint' : 'New Feasibility Blueprint'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={handleNewBlueprint}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
            >
              Start New Blueprint
            </button>
          )}
        </div>

        {linkedPaper && (
          <div className="flex items-center justify-between gap-3 bg-sky-400/10 border border-sky-400/30 rounded-xl px-4 py-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 mr-1.5">Grounded Literature:</span>
                {linkedPaper.url ? (
                  <a
                    href={linkedPaper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-300 hover:underline truncate inline-flex items-center gap-1 max-w-full"
                  >
                    <span className="truncate">{linkedPaper.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-semibold text-slate-100">{linkedPaper.title}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClearLinkedPaper}
              aria-label="Remove linked literature"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="poc-title" className="block text-xs font-semibold text-slate-300">
              1. Invention or Project Title
            </label>
            <input
              id="poc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Closed-Loop Algal O2 Generator"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="poc-domain" className="block text-xs font-semibold text-slate-300">
              2. Scientific Domain
            </label>
            <select
              id="poc-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-400 transition-colors"
            >
              {POC_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="poc-hypothesis" className="block text-xs font-semibold text-slate-300">
            3. Core Mechanism & Hypothesis
          </label>
          <textarea
            id="poc-hypothesis"
            rows={4}
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="Describe the physical, chemical, or biological mechanism you want to validate..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm leading-relaxed focus:outline-none focus:border-sky-400 transition-colors resize-y"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="poc-params" className="block text-xs font-semibold text-slate-300">
            4. Key Parameters & Boundary Constraints
          </label>
          <input
            id="poc-params"
            type="text"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            placeholder="e.g., 12V solar input, 37°C operating temp, 500mg/L concentration, < 2kg mass"
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B1120] border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {formNotice && (
          <p
            role="status"
            className={`text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl border ${
              formNotice.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {formNotice.text}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => void runAudit(false)}
            disabled={auditing}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>{auditing ? 'Running Feasibility Audit...' : 'Run Feasibility Audit'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800/80 text-slate-100 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            <BookmarkPlus className="w-4 h-4 shrink-0" />
            <span>{saving ? 'Saving...' : 'Save Private Blueprint'}</span>
          </button>
        </div>

        {auditError && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-amber-200">{auditError}</p>
            <button
              type="button"
              onClick={() => void runAudit(true)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
            >
              Run Offline Checklist
            </button>
          </div>
        )}

        {auditReport && (
          <div className="bg-[#0B1120] border border-sky-400/40 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-sky-400">Feasibility Dossier</span>
                {auditMode && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span>
                      {auditMode === 'gemini' ? 'AI First-Principles Review' : 'Structured Checklist'}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleCopyDossier()}
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Dossier</span>
                  </>
                )}
              </button>
            </div>

            <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-200 leading-relaxed">
              {auditReport}
            </pre>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Proof-of-Concept workspace lists"
            className="grid grid-cols-2 sm:inline-flex gap-1.5 p-1 bg-[#131C2E] border border-slate-800 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={listView === 'mine'}
              onClick={() => handleSwitchList('mine')}
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                listView === 'mine'
                  ? 'bg-slate-800 text-slate-50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                My Private PoCs (<span className="font-mono-num">{privatePocs.length}</span>)
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={listView === 'showcase'}
              onClick={() => handleSwitchList('showcase')}
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                listView === 'showcase'
                  ? 'bg-slate-800 text-slate-50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Global Showcase</span>
            </button>
          </div>

          {!user && listView === 'mine' && (
            <button
              type="button"
              onClick={onSignIn}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer text-left sm:text-right"
            >
              Sign in with Google to sync & opt-in publish
            </button>
          )}
        </div>

        {listView === 'mine' ? (
          privatePocs.length === 0 ? (
            <div className="bg-[#131C2E] border border-slate-800/80 rounded-2xl p-10 text-center space-y-2">
              <FlaskConical className="w-6 h-6 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-slate-100">
                No private blueprints saved yet
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Tap PoC on any paper in Explore or draft a mechanism above to save private feasibility blueprints here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {privatePocs.map((poc) => {
                const isPub = Boolean(poc.isPublic);
                const confirming = confirmPublishId === poc.id;
                return (
                  <article
                    key={poc.id}
                    className="flex flex-col justify-between bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5 space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-sky-300">{poc.domain}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isPub ? 'text-sky-400' : 'text-emerald-400'
                          }`}
                        >
                          {isPub ? (
                            <>
                              <Globe className="w-3.5 h-3.5" />
                              <span>Public Showcase</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Private</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-slate-50 leading-snug">
                        {poc.title}
                      </h3>

                      {poc.linkedPaperTitle && (
                        <div className="flex items-center gap-1.5 text-xs text-sky-400/90">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{poc.linkedPaperTitle}</span>
                        </div>
                      )}

                      <p className="font-serif-prose text-sm text-slate-300/85 leading-relaxed line-clamp-3">
                        {poc.hypothesis}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {confirming ? (
                        <div className="bg-[#0B1120] border border-slate-700 rounded-xl p-3 space-y-2.5">
                          <p className="text-xs text-slate-200">
                            {isPub
                              ? `Make "${poc.title}" private again and remove it from the Global Showcase?`
                              : `Publish "${poc.title}" to the public Global Student Showcase?`}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setConfirmPublishId(null);
                                await onTogglePublish(poc);
                              }}
                              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold cursor-pointer"
                            >
                              {isPub ? 'Confirm Make Private' : 'Confirm Publish'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPublishId(null)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadIntoEditor(poc)}
                            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Open in Editor
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                setFormNotice({
                                  type: 'error',
                                  text: 'Sign in with Google first to sync and publish blueprints to the Global Showcase.',
                                });
                                return;
                              }
                              setConfirmPublishId(poc.id);
                            }}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              isPub
                                ? 'border-sky-400/50 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20'
                                : 'border-slate-700 text-slate-300 hover:bg-slate-800/80'
                            }`}
                          >
                            {isPub ? (
                              <>
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <span>Make Private</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>Publish Opt-In</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void onDeletePoc(poc.id)}
                            aria-label={`Delete ${poc.title}`}
                            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : showcaseLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
            {[0, 1].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl bg-[#131C2E] border border-slate-800/80 p-5 animate-pulse"
              />
            ))}
          </div>
        ) : showcaseError ? (
          <div className="bg-[#131C2E] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm text-slate-300">{showcaseError}</p>
            <button
              type="button"
              onClick={onLoadShowcase}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : showcasePocs.length === 0 ? (
          <div className="bg-[#131C2E] border border-slate-800/80 rounded-2xl p-10 text-center space-y-2">
            <Globe className="w-6 h-6 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-100">
              No public blueprints published yet
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              All student Proof-of-Concept blueprints remain private unless explicitly opted into the Global Showcase.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showcasePocs.map((poc) => {
              const isExpanded = expandedShowcaseId === poc.id;
              return (
                <article
                  key={poc.id}
                  className="bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-sky-400">{poc.domain}</span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>Community Showcase</span>
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-50 leading-snug">{poc.title}</h3>

                  {poc.linkedPaperTitle && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-400/90">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      {poc.linkedPaperUrl ? (
                        <a
                          href={poc.linkedPaperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {poc.linkedPaperTitle}
                        </a>
                      ) : (
                        <span className="truncate">{poc.linkedPaperTitle}</span>
                      )}
                    </div>
                  )}

                  <p className="font-serif-prose text-sm text-slate-300/85 leading-relaxed">
                    {poc.hypothesis}
                  </p>

                  {poc.auditReport && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedShowcaseId(isExpanded ? null : poc.id)}
                        className="text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        {isExpanded ? 'Hide Feasibility Dossier' : 'View Feasibility Dossier'}
                      </button>
                      {isExpanded && (
                        <pre className="mt-2.5 p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed">
                          {poc.auditReport}
                        </pre>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
