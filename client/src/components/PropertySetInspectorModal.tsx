import React, { useState } from 'react';
import { Card, CardType, PropertyColor, PropertySet } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { CardView } from './CardView';

interface PropertySetInspectorModalProps {
  ownerName: string;
  set: PropertySet;
  isOwner: boolean;
  isMyTurn: boolean;
  playsRemaining: number;
  allPlayerSets: PropertySet[];
  onFlipWildcard: (card: Card, toColor: PropertyColor) => void;
  onMoveShack: (fromColor: PropertyColor, toColor: PropertyColor) => void;
  onClose: () => void;
}

export const PropertySetInspectorModal: React.FC<PropertySetInspectorModalProps> = ({
  ownerName,
  set,
  isOwner,
  isMyTurn,
  playsRemaining,
  allPlayerSets,
  onFlipWildcard,
  onMoveShack,
  onClose,
}) => {
  const [flippingCardId, setFlippingCardId] = useState<string | null>(null);
  const [isMovingShack, setIsMovingShack] = useState(false);

  const config = PROPERTY_CONFIG[set.color];
  const count = set.cards.length;
  const isComplete = count >= (config?.setSize || 3);
  const baseRent =
    config?.rentValues?.[Math.min(count - 1, (config?.rentValues?.length || 1) - 1)] || 1;
  const shackBonus = set.shack ? 3 : 0;
  const houseBonus = set.house ? 3 : 0;
  const hotelBonus = set.hotel ? 4 : 0;
  const totalRent = baseRent + shackBonus + houseBonus + hotelBonus;

  // Eligible destination sets for moving shack (owned sets with cards, no shack, not this set)
  const eligibleShackDestinations = allPlayerSets.filter(
    (s) => s.color !== set.color && s.cards.length > 0 && !s.shack
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full bg-slate-900 border-2 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col"
        style={{ borderColor: config?.hexColor || '#f59e0b' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color Header */}
        <div
          className="rounded-2xl p-3 flex items-center justify-between shadow-md mb-4 flex-shrink-0"
          style={{ backgroundColor: config?.hexColor, color: config?.textColor }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🏡</span>
            <div>
              <div className="font-heading font-black text-base md:text-lg uppercase tracking-wider">
                {ownerName} {config?.name} Set
              </div>
              <div className="text-xs font-mono font-bold opacity-90">
                {count}/{config?.setSize} Cards {isComplete ? '• FULL SET COMPLETE! ✓' : '• Incomplete'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Rent Ladder & Bonuses */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
            <div className="font-heading font-bold text-slate-300 uppercase tracking-wider">
              Rent Ladder & Bonuses
            </div>
            <div className="font-mono text-emerald-400 font-extrabold text-sm">
              Current Total Rent: ${totalRent}M
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {config?.rentValues?.map((val, idx) => {
              const cardStep = idx + 1;
              const isCurrentStep = count === cardStep;
              return (
                <div
                  key={idx}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isCurrentStep
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-amber-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono">
                    {cardStep} Card{cardStep > 1 ? 's' : ''} {cardStep === config.setSize ? '★' : ''}
                  </div>
                  <div className="text-sm font-mono font-black mt-0.5">${val}M</div>
                </div>
              );
            })}
          </div>

          {/* Shack, House, Hotel Status & Move Shack Action */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
            {set.shack && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs px-2.5 py-1 rounded-xl font-bold">
                <span>🛖 Shack: +$3M</span>
                {isOwner && isMyTurn && playsRemaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsMovingShack(!isMovingShack)}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider hover:bg-amber-300 transition-colors shadow"
                  >
                    {isMovingShack ? 'Cancel Move' : 'Move Shack (1 Play)'}
                  </button>
                )}
              </div>
            )}
            {set.house && (
              <span className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs px-2.5 py-1 rounded-xl font-bold">
                🏠 House: +$3M
              </span>
            )}
            {set.hotel && (
              <span className="bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs px-2.5 py-1 rounded-xl font-bold">
                🏨 Hotel: +$4M
              </span>
            )}
          </div>

          {/* Move Shack Destination Picker (Point 7) */}
          {isMovingShack && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-400/40 rounded-xl animate-fade-in">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
                Choose Destination Property Set to Move Shack to (Costs 1 Play):
              </div>
              {eligibleShackDestinations.length === 0 ? (
                <div className="text-xs text-rose-400 italic">
                  No other eligible property sets owned to move the shack to.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {eligibleShackDestinations.map((dest) => {
                    const destConf = PROPERTY_CONFIG[dest.color];
                    return (
                      <button
                        key={dest.color}
                        type="button"
                        onClick={() => {
                          onMoveShack(set.color, dest.color);
                          setIsMovingShack(false);
                          onClose();
                        }}
                        className="p-2 rounded-xl border text-left font-bold text-xs uppercase transition-all shadow hover:scale-[1.02] active:scale-95"
                        style={{
                          backgroundColor: destConf?.hexColor,
                          color: destConf?.textColor,
                          borderColor: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <div>{destConf?.name}</div>
                        <div className="text-[10px] opacity-80 font-mono">
                          {dest.cards.length} cards
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cards in Set (Rendered authentically) */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-0">
          <div className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 mb-2">
            Cards in this Property Set ({count}):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
            {set.cards.map((c) => {
              const isWild = c.type === CardType.PROPERTY_WILDCARD;
              const isSelectedForFlip = flippingCardId === c.id;

              // Color choices for wildcard
              const availableColors: PropertyColor[] = c.isRainbow
                ? allPlayerSets.map((s) => s.color).filter((col) => col !== set.color)
                : (c.colors || []).filter((col) => col !== set.color);

              return (
                <div key={c.id} className="flex flex-col items-center">
                  <div className="transform scale-90 sm:scale-100 origin-top">
                    <CardView card={c} size="sm" isPlayable={false} />
                  </div>

                  {/* Wildcard Flip Button (Points 3, 5, 9) */}
                  {isWild && isOwner && isMyTurn && playsRemaining > 0 && (
                    <div className="w-full mt-2 flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setFlippingCardId(isSelectedForFlip ? null : c.id)
                        }
                        className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-[10px] uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all"
                      >
                        {isSelectedForFlip ? 'Cancel Flip' : '🔄 Flip Color (1 Play)'}
                      </button>

                      {isSelectedForFlip && (
                        <div className="w-full mt-1.5 p-2 bg-slate-950/90 border border-amber-400/40 rounded-xl space-y-1 animate-fade-in">
                          <div className="text-[9px] text-slate-300 font-bold uppercase text-center">
                            Flip to:
                          </div>
                          {availableColors.length === 0 ? (
                            <div className="text-[9px] text-rose-400 text-center italic">
                              No eligible colors to flip to.
                            </div>
                          ) : (
                            availableColors.map((targetCol) => {
                              const tConf = PROPERTY_CONFIG[targetCol];
                              return (
                                <button
                                  key={targetCol}
                                  type="button"
                                  onClick={() => {
                                    onFlipWildcard(c, targetCol);
                                    setFlippingCardId(null);
                                    onClose();
                                  }}
                                  className="w-full py-1 px-1.5 rounded-lg text-[9px] font-bold uppercase tracking-tight text-center transition-transform hover:scale-105 active:scale-95 shadow"
                                  style={{
                                    backgroundColor: tConf?.hexColor,
                                    color: tConf?.textColor,
                                  }}
                                >
                                  {tConf?.name}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center flex-shrink-0 mt-3 text-xs text-slate-400">
          <span>Manage wildcards and shacks directly from this view.</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl font-heading font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs uppercase tracking-wider transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
