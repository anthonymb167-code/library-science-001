import React, { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { ScienceResource } from '../data/libraryCatalog';

interface ReaderModalProps {
  resource: ScienceResource | null;
  onClose: () => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({ resource, onClose }) => {
  useEffect(() => {
    if (!resource) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resource, onClose]);

  if (!resource) return null;

  const isPdfUrl =
    resource.isPdfDirect ||
    resource.pdfUrl.toLowerCase().endsWith('.pdf') ||
    resource.pdfUrl.includes('arxiv.org/pdf/') ||
    resource.pdfUrl.includes('pdf=render');

  const viewerUrl = isPdfUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resource.pdfUrl)}`
    : resource.pdfUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
      className="fixed inset-0 z-50 flex flex-col bg-[#0B1120]"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#131C2E] border-b border-slate-800">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 truncate">
            {resource.source} · <span className="font-mono-num">{resource.year}</span>
          </p>
          <h3 className="text-sm sm:text-base font-semibold text-slate-50 truncate">
            {resource.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={resource.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Direct PDF / Site</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between gap-3">
        <span className="truncate">
          If the publisher blocks embedded frames, select Direct PDF / Site to open or download directly.
        </span>
      </div>

      <iframe
        title={resource.title}
        src={viewerUrl}
        className="flex-1 w-full bg-white border-0"
      />
    </div>
  );
};
