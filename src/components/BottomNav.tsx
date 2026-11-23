import React from 'react';
import { Bookmark, Compass, FlaskConical, Library } from 'lucide-react';
import { ActiveTab } from './TopBar';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, savedCount }) => {
  return (
    <nav
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center"
    >
      <button
        type="button"
        onClick={() => onSelectTab('explore')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
          activeTab === 'explore' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span>Explore</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('saved')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
          activeTab === 'saved' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bookmark className="w-5 h-5" />
        <span>
          Saved (<span className="font-mono-num">{savedCount}</span>)
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('poc')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
          activeTab === 'poc' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FlaskConical className="w-5 h-5" />
        <span>PoC Lab</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('portals')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
          activeTab === 'portals' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Library className="w-5 h-5" />
        <span>Portals</span>
      </button>
    </nav>
  );
};
