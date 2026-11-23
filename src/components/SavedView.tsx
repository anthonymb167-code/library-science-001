import React from 'react';
import { User } from 'firebase/auth';
import { Cloud, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { ScienceResource } from '../data/libraryCatalog';
import { ResourceCard } from './ResourceCard';

interface SavedViewProps {
  savedItems: ScienceResource[];
  user: User | null;
  authLoading: boolean;
  syncing: boolean;
  syncError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshSync: () => void;
  onRead: (item: ScienceResource) => void;
  onToggleSave: (item: ScienceResource) => void;
  onSendToPoc?: (item: ScienceResource) => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  savedItems,
  user,
  authLoading,
  syncing,
  syncError,
  onSignIn,
  onSignOut,
  onRefreshSync,
  onRead,
  onToggleSave,
  onSendToPoc,
}) => {
  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131C2E] border border-slate-800/90 rounded-2xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              {user ? 'Cloud Reading List Active' : 'Offline Reading List'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {user
              ? `Synced across devices for ${user.email || user.displayName}`
              : 'Bookmarks are saved locally in this browser. Sign in with Google to sync across devices.'}
          </p>
          {syncError && (
            <p className="text-xs text-amber-400 pt-1">{syncError}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={onRefreshSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{authLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {savedItems.length === 0 ? (
        <div className="bg-[#131C2E] border border-slate-800/80 rounded-2xl p-10 text-center space-y-2">
          <h2 className="text-base font-semibold text-slate-100">No saved documents yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Select Save on any university textbook or research paper in Explore to bookmark it here for quick reference.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedItems.map((item) => (
            <ResourceCard
              key={item.id}
              item={item}
              isSaved={true}
              onRead={onRead}
              onToggleSave={onToggleSave}
              onSendToPoc={onSendToPoc}
            />
          ))}
        </div>
      )}
    </section>
  );
};
