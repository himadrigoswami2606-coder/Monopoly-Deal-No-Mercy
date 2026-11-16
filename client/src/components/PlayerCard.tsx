import React from 'react';
import { PublicPlayerView, Player } from '../../../shared/types';

// Distinct 6-player avatar palettes
export const PLAYER_COLORS = [
  { name: 'Amber', bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500', border: 'border-amber-500' },
  { name: 'Emerald', bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500', border: 'border-emerald-500' },
  { name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', ring: 'ring-cyan-500', border: 'border-cyan-500' },
  { name: 'Purple', bg: 'bg-purple-500', text: 'text-purple-400', ring: 'ring-purple-500', border: 'border-purple-500' },
  { name: 'Rose', bg: 'bg-rose-500', text: 'text-rose-400', ring: 'ring-rose-500', border: 'border-rose-500' },
  { name: 'Indigo', bg: 'bg-indigo-500', text: 'text-indigo-400', ring: 'ring-indigo-500', border: 'border-indigo-500' },
];

interface PlayerCardProps {
  player: Player | PublicPlayerView;
  isSelf?: boolean;
  isActiveTurn?: boolean;
  showLobbyControls?: boolean;
  onToggleReady?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelf = false,
  isActiveTurn = false,
  showLobbyControls = false,
  onToggleReady,
}) => {
  const colorTheme = PLAYER_COLORS[player.colorIndex % PLAYER_COLORS.length];
  const initial = player.displayName.charAt(0).toUpperCase() || 'P';

  return (
    <div
      className={`relative rounded-xl p-3.5 transition-all duration-200 border ${
        isActiveTurn
          ? 'bg-slate-800/90 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/50'
          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar Circle */}
        <div
          className={`relative w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-slate-950 text-lg shadow-inner ${colorTheme.bg}`}
        >
          {initial}
          {player.isHost && (
            <span
              title="Room Host"
              className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 p-0.5 px-1 rounded-full text-xs font-black shadow"
            >
              👑
            </span>
          )}
        </div>

        {/* Player Name and Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 truncate text-base">
              {player.displayName}
            </span>
            {isSelf && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                You
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {player.isHost && (
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                Host
              </span>
            )}
            {!player.isHost && (
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  player.isReady ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    player.isReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                {player.isReady ? 'Ready' : 'Waiting'}
              </span>
            )}
          </div>
        </div>

        {/* Lobby Ready Toggle Button */}
        {showLobbyControls && isSelf && !player.isHost && onToggleReady && (
          <button
            onClick={onToggleReady}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow ${
              player.isReady
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            {player.isReady ? 'Ready ✓' : 'Set Ready'}
          </button>
        )}
      </div>
    </div>
  );
};
