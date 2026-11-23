import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

export type ActiveTab = 'explore' | 'saved' | 'poc' | 'portals';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount: number;
  pocCount: number;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  pocCount,
  user,
  authLoading,
  onSignIn,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 h-[52px] md:h-16 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('explore')}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Open Tertiary Science
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            type="button"
            onClick={() => onSelectTab('explore')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'explore'
                ? 'text-slate-50 border-sky-400'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Explore
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('saved')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'saved'
                ? 'text-slate-50 border-sky-400'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Saved (<span className="font-mono-num">{savedCount}</span>)
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('poc')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'poc'
                ? 'text-slate-50 border-sky-400'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            PoC Lab (<span className="font-mono-num">{pocCount}</span>)
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('portals')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'portals'
                ? 'text-slate-50 border-sky-400'
                : 'border-transparent hover:text-slate-100'
            }`}
          >
            Academic Portals
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authLoading}
              title={user.email || 'Signed in'}
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{authLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
