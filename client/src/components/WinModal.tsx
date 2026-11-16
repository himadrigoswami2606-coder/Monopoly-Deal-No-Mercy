import React from 'react';
import { PublicPlayerView, WinConditionResult } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';

interface WinModalProps {
  winner: PublicPlayerView;
  breakdown: WinConditionResult;
  onClose: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({ winner, breakdown, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-5xl mb-2">🏆</div>
        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">
          Victory Declared
        </div>

        <h2 className="text-3xl font-heading font-extrabold text-slate-100 uppercase tracking-tight">
          {winner.displayName} Wins!
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Fulfilled all No Mercy victory requirements
        </p>

        {/* Breakdown Card */}
        <div className="mt-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-400 border-b border-slate-800 pb-2">
            Winning Breakdown
          </div>

          {/* Complete Sets */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="text-amber-400">▪</span> Full Property Sets:
            </span>
            <span className="font-bold text-amber-400">
              {breakdown.completeSets} / {breakdown.requiredSets} Sets
            </span>
          </div>
          {breakdown.completeColors.length > 0 && (
            <div className="flex flex-wrap gap-1 pl-4">
              {breakdown.completeColors.map((color) => (
                <span
                  key={color}
                  className="text-[10px] px-2 py-0.5 rounded font-bold"
                  style={{
                    backgroundColor: PROPERTY_CONFIG[color]?.hexColor || '#475569',
                    color: PROPERTY_CONFIG[color]?.textColor || '#fff',
                  }}
                >
                  {PROPERTY_CONFIG[color]?.name || color}
                </span>
              ))}
            </div>
          )}

          {/* Bank Cash */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="text-emerald-400">▪</span> Bank Balance:
            </span>
            <span className="font-bold text-emerald-400">
              ${breakdown.bankTotal}M / ${breakdown.requiredBank}M Cash
            </span>
          </div>

          {/* Debt Chips */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <span className="text-blue-400">▪</span> Owned Debt Chips:
            </span>
            <span className="font-bold text-blue-400">
              {breakdown.ownedChipsHeld} / {breakdown.requiredChips} Held
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 px-6 rounded-xl font-heading font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 text-sm uppercase tracking-wider"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
};
