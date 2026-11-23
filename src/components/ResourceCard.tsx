import React from 'react';
import { Bookmark, BookOpen, Check, FileText, FlaskConical, Landmark } from 'lucide-react';
import { ScienceResource } from '../data/libraryCatalog';

interface ResourceCardProps {
  item: ScienceResource;
  isSaved: boolean;
  onRead: (item: ScienceResource) => void;
  onToggleSave: (item: ScienceResource) => void;
  onSendToPoc?: (item: ScienceResource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  item,
  isSaved,
  onRead,
  onToggleSave,
  onSendToPoc,
}) => {
  const formatLabel = item.type === 'book' ? 'Textbook' : 'Research Paper';

  return (
    <article className="flex flex-col justify-between bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mb-2">
          <span
            className={`font-semibold ${
              item.type === 'book' ? 'text-violet-300' : 'text-sky-300'
            }`}
          >
            {formatLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span>{item.source}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num text-slate-400">{item.year}</span>
        </div>

        <h2 className="text-base sm:text-[17px] font-semibold text-slate-50 leading-snug mb-1.5">
          {item.title}
        </h2>

        <p className="text-xs sm:text-sm font-medium text-sky-400/90 mb-1.5 line-clamp-1">
          {item.authors}
        </p>

        {item.institution && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-3">
            <Landmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{item.institution}</span>
          </div>
        )}

        <p className="font-serif-prose text-sm text-slate-300/85 leading-relaxed line-clamp-3 mb-5">
          {item.abstract}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onRead(item)}
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 text-sm font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          {item.type === 'book' ? (
            <BookOpen className="w-4 h-4 shrink-0" />
          ) : (
            <FileText className="w-4 h-4 shrink-0" />
          )}
          <span>Read</span>
        </button>

        {onSendToPoc && (
          <button
            type="button"
            onClick={() => onSendToPoc(item)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span>PoC</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleSave(item)}
          aria-pressed={isSaved}
          aria-label={isSaved ? 'Remove from saved' : 'Save bookmark'}
          className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
            isSaved
              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              : 'border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 shrink-0" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4 shrink-0" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
