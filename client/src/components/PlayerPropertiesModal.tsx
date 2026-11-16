import React, { useState } from 'react';
import { Card, CardType, PropertyColor, PropertySet } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';

interface PlayerPropertiesModalProps {
  playerName: string;
  properties: PropertySet[];
  completeSetsCount: number;
  isSelf: boolean;
  isMyTurn?: boolean;
  playsRemaining?: number;
  onFlipWildcard?: (card: Card, toColor: PropertyColor) => void;
  onMoveShack?: (fromColor: PropertyColor, toColor: PropertyColor) => void;
  onClose: () => void;
}

export const PlayerPropertiesModal: React.FC<PlayerPropertiesModalProps> = ({
  playerName,
  properties,
  completeSetsCount,
  isSelf,
  isMyTurn = false,
  playsRemaining = 0,
  onFlipWildcard,
  onMoveShack,
  onClose,
}) => {
  const [movingShackFrom, setMovingShackFrom] = useState<PropertyColor | null>(null);
  const [flippingCardId, setFlippingCardId] = useState<string | null>(null);

  // Total cash value of all properties on the table
  const totalPropertyValue = properties.reduce(
    (sum, set) => sum + set.cards.reduce((s, c) => s + c.cashValue, 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full bg-[#0d2318] border-2 border-amber-400/80 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1f4d36] mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏰</span>
            <div>
              <h2 className="font-heading font-black text-lg md:text-xl uppercase tracking-wider text-amber-300">
                {isSelf ? 'Your Property Collection' : `${playerName}'s Property Collection`}
              </h2>
              <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono mt-0.5">
                <span className="bg-[#143d29] px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 font-bold">
                  🏆 {completeSetsCount} / 3 Complete Sets
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  {properties.length} {properties.length === 1 ? 'Set' : 'Sets'} on Table
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold">
                  Total Asset Value: ${totalPropertyValue}M
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#184a32] hover:bg-[#236846] text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors border border-[#2d6a4f]"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Property Sets Grid */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-0 space-y-3">
          {properties.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-black/20 rounded-2xl border border-dashed border-[#1f4d36] space-y-2">
              <span className="text-3xl block">🏘️</span>
              <p className="text-sm font-heading font-bold text-slate-300">No properties played on table yet.</p>
              <p className="text-xs text-slate-500">Property cards placed on the table will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {properties.map((set) => {
                const config = PROPERTY_CONFIG[set.color];
                const count = set.cards.length;
                const setSize = config?.setSize || 3;
                const isComplete = count >= setSize;

                const baseRent =
                  config?.rentValues?.[Math.min(count - 1, (config?.rentValues?.length || 1) - 1)] || 1;
                const shackBonus = set.shack ? 3 : 0;
                const houseBonus = set.house ? 3 : 0;
                const hotelBonus = set.hotel ? 4 : 0;
                const totalRent = baseRent + shackBonus + houseBonus + hotelBonus;

                return (
                  <div
                    key={set.color}
                    className={`bg-[#081a12] rounded-2xl p-3 border transition-all flex flex-col justify-between shadow-lg ${
                      isComplete
                        ? 'border-amber-400/80 ring-1 ring-amber-400/30'
                        : 'border-[#1f4d36]'
                    }`}
                  >
                    <div>
                      {/* Set Color Banner */}
                      <div
                        className="rounded-xl px-2.5 py-1.5 flex items-center justify-between mb-2 shadow-sm font-heading font-black text-xs uppercase tracking-wide"
                        style={{
                          backgroundColor: config?.hexColor || '#334155',
                          color: config?.textColor || '#ffffff',
                        }}
                      >
                        <span className="truncate">{config?.name || set.color}</span>
                        <span className="font-mono bg-black/30 px-1.5 py-0.2 rounded text-[11px]">
                          {count} / {setSize}
                        </span>
                      </div>

                      {/* Status Badges & Rent Calculation */}
                      <div className="flex items-center justify-between gap-1 mb-2 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isComplete
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isComplete ? '🏆 Complete Set' : 'Incomplete'}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 bg-black/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          Rent: ${totalRent}M
                        </span>
                      </div>

                      {/* Active Buildings / Shack Breakdown */}
                      {(set.shack || set.house || set.hotel) && (
                        <div className="flex flex-wrap gap-1 mb-2 bg-[#0d2a1d] p-1.5 rounded-xl border border-[#1b4330] text-[9.5px]">
                          {set.shack && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              🛖 Shack (+ $3M)
                            </span>
                          )}
                          {set.house && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              🏠 House (+ $3M)
                            </span>
                          )}
                          {set.hotel && (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-400/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              🏨 Hotel (+ $4M)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cards List in this Set */}
                      <div className="space-y-1.5 mb-2">
                        {set.cards.map((c) => {
                          const isWild =
                            c.type === CardType.PROPERTY_WILDCARD || Boolean(c.isRainbow);
                          const isFlipping = flippingCardId === c.id;

                          return (
                            <div
                              key={c.id}
                              className="bg-[#0e271a] border border-[#19402c] rounded-xl p-2 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold truncate text-slate-100">{c.name}</span>
                                {isWild && (
                                  <span className="text-[9px] bg-purple-500/30 text-purple-200 border border-purple-400/40 px-1.5 py-0.2 rounded-full font-bold">
                                    {c.isRainbow ? '🌈 Wild' : 'Wild'}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-emerald-400 font-bold bg-black/40 px-1.5 py-0.5 rounded flex-shrink-0">
                                ${c.cashValue}M
                              </span>

                              {/* Flip Wildcard Button (Self Only, Costs 1 Turn Play) */}
                              {isSelf && isMyTurn && playsRemaining > 0 && isWild && onFlipWildcard && (
                                <button
                                  type="button"
                                  onClick={() => setFlippingCardId(isFlipping ? null : c.id)}
                                  className="ml-2 text-[9px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40 transition-colors"
                                  title="Flip wildcard to another color (Costs 1 shot)"
                                >
                                  🔄 Flip
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Wildcard Color Choice Options if open */}
                      {flippingCardId && (
                        <div className="p-2 bg-black/40 rounded-xl border border-amber-500/30 mb-2">
                          <div className="text-[10px] text-amber-300 font-bold mb-1">
                            Flip to which color? (Costs 1 shot):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {set.cards.find((c) => c.id === flippingCardId)?.colors?.map((col) => {
                              if (col === set.color) return null;
                              const colMeta = PROPERTY_CONFIG[col];
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => {
                                    const card = set.cards.find((c) => c.id === flippingCardId);
                                    if (card && onFlipWildcard) {
                                      onFlipWildcard(card, col);
                                      setFlippingCardId(null);
                                    }
                                  }}
                                  className="px-2 py-1 rounded text-[10px] font-bold shadow text-slate-950 uppercase"
                                  style={{
                                    backgroundColor: colMeta?.hexColor,
                                    color: colMeta?.textColor,
                                  }}
                                >
                                  ➔ {colMeta?.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shack Move Control (Self Only, Costs 1 Turn Play) */}
                    {isSelf && isMyTurn && playsRemaining > 0 && set.shack && onMoveShack && (
                      <div className="pt-2 border-t border-[#19402c] mt-1">
                        {movingShackFrom === set.color ? (
                          <div className="space-y-1">
                            <span className="text-[9px] text-amber-300 font-bold block">
                              Move Shack to which Property? (1 Shot):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {properties
                                .filter((s) => s.color !== set.color && !s.shack)
                                .map((targetSet) => (
                                  <button
                                    key={targetSet.color}
                                    type="button"
                                    onClick={() => {
                                      onMoveShack(set.color, targetSet.color);
                                      setMovingShackFrom(null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-400 text-slate-950 hover:bg-amber-300"
                                  >
                                    ➔ {PROPERTY_CONFIG[targetSet.color]?.name}
                                  </button>
                                ))}
                              <button
                                type="button"
                                onClick={() => setMovingShackFrom(null)}
                                className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMovingShackFrom(set.color)}
                            className="w-full py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 transition-colors uppercase tracking-wider"
                          >
                            🛖 Move Shack (1 Shot)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-[#1f4d36] flex justify-between items-center flex-shrink-0 mt-3 text-xs text-slate-400">
          <span>Complete 3 full color sets to achieve the property victory goal.</span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl font-heading font-bold bg-[#184a32] hover:bg-[#226344] text-slate-100 text-xs uppercase tracking-wider transition-colors border border-[#2d6a4f]"
          >
            Close Properties
          </button>
        </div>
      </div>
    </div>
  );
};
