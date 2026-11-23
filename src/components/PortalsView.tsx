import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ACADEMIC_PORTALS, PortalCategory } from '../data/libraryCatalog';

const CATEGORIES: PortalCategory[] = [
  'All',
  'University Repositories',
  'Clinical & Pharmacy',
  'Textbooks & Syllabi',
  'Papers & Directories',
];

export const PortalsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<PortalCategory>('All');

  const filteredPortals =
    selectedCategory === 'All'
      ? ACADEMIC_PORTALS
      : ACADEMIC_PORTALS.filter((p) => p.category === selectedCategory);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
          Direct Academic & Clinical Portals
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Dedicated launchers for specialized clinical manuals, drug interaction databases, open university syllabi, and preprint servers across every tertiary science discipline.
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
              selectedCategory === category
                ? 'bg-sky-400 text-slate-950 border-sky-400'
                : 'bg-[#131C2E] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-slate-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPortals.map((portal) => (
          <a
            key={portal.id}
            href={portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-between bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5 hover:border-sky-400/50 transition-colors"
          >
            <div>
              <div className="text-xs text-slate-400 mb-2">
                <span className="text-sky-400 font-medium">{portal.category}</span>
                <span aria-hidden="true"> · </span>
                <span>{portal.accessType}</span>
              </div>
              <h2 className="text-base font-semibold text-slate-50 group-hover:text-sky-300 transition-colors mb-2">
                {portal.name}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {portal.description}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <span>Open Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
