import React from 'react';
import { Card, PropertyColor, Player } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';

interface WildcardSelectModalProps {
  card: Card;
  myPlayer: Player;
  onSelectColor: (color: PropertyColor) => void;
  onCancel: () => void;
}

export const WildcardSelectModal: React.FC<WildcardSelectModalProps> = ({
  card,
  myPlayer,
  onSelectColor,
  onCancel,
}) => {
  // For rainbow wildcard, only allow colors the player currently owns in their properties
  const ownedColors = Array.from(
    new Set(
      myPlayer.properties
        .filter((s) => s.cards.length > 0)
        .map((s) => s.color)
    )
  );

  const eligibleColors = card.isRainbow
    ? ownedColors
    : (card.colors || (Object.keys(PROPERTY_CONFIG) as PropertyColor[]));

  // Find which set is closer to completion to badge with 'BEST'
  let bestColor = eligibleColors[0];
  let maxCount = -1;

  eligibleColors.forEach((color) => {
    const set = myPlayer.properties.find((s) => s.color === color);
    const count = set ? set.cards.length : 0;
    const setSize = PROPERTY_CONFIG[color]?.setSize || 3;
    if (count > maxCount && count < setSize) {
      maxCount = count;
      bestColor = color;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-lg w-full bg-[#1b231c] border-2 border-amber-500/80 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{card.isRainbow ? '🌈' : '🃏'}</span>
            <h2 className="font-heading font-extrabold text-base md:text-lg uppercase tracking-wide text-slate-100">
              {card.isRainbow ? 'Play Rainbow Wildcard' : `Play ${card.name}`}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-[#102b1e] p-2.5 rounded-xl border border-[#1f4d36]">
          {card.isRainbow
            ? 'Choose which of your current property sets to add this Rainbow Wildcard to. (Rule: A Rainbow Wildcard cannot start a new color set — it must match a property color you already own on the table).'
            : 'Pick a color to place this dual wildcard. The highlighted rent ladder indicates your new rent value.'}
        </p>

        {/* Side-by-Side Color Tiles (Identical to Screenshot 1) */}
        {eligibleColors.length === 0 ? (
          <div className="p-4 bg-black/40 rounded-2xl border border-amber-500/30 text-center my-4">
            <p className="text-amber-400 font-bold text-xs uppercase mb-1">No Eligible Property Sets</p>
            <p className="text-[11px] text-slate-300">
              According to Monopoly Deal: No Mercy rules, a Rainbow Wildcard can only be placed on or flipped to a color you currently own in your properties!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            {eligibleColors.map((color) => {
              const meta = PROPERTY_CONFIG[color];
              const set = myPlayer.properties.find((s) => s.color === color);
              const currentCount = set ? set.cards.length : 0;
              const newCount = currentCount + 1;
              const isBest = color === bestColor && currentCount > 0;

            return (
              <div
                key={color}
                className="bg-[#242d25] rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg flex flex-col justify-between"
              >
                {/* Tile Header */}
                <div
                  className="px-3 py-2 flex items-center justify-between shadow-sm font-heading font-black text-xs uppercase tracking-wider"
                  style={{ backgroundColor: meta?.hexColor, color: meta?.textColor }}
                >
                  <div className="flex items-center gap-1.5">
                    {isBest && (
                      <span className="bg-black/40 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-sans font-extrabold tracking-widest">
                        BEST
                      </span>
                    )}
                    <span>{meta?.name}</span>
                  </div>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {currentCount}/{meta?.setSize}
                  </span>
                </div>

                {/* Rent Ladder */}
                <div className="p-3 bg-[#171e18] space-y-1">
                  {meta?.rentValues.map((rent, idx) => {
                    const rowNumber = idx + 1;
                    const isTargetRow = rowNumber === newCount;
                    const isCompleteRow = rowNumber === meta.setSize;

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between items-center px-2 py-1 rounded text-xs transition-colors ${
                          isTargetRow
                            ? 'bg-amber-100/90 text-slate-950 font-black shadow-sm ring-1 ring-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        <span className="font-medium">
                          {rowNumber} {isCompleteRow ? '★' : ''}
                        </span>
                        <span className="font-mono font-bold">${rent}M</span>
                      </div>
                    );
                  })}
                </div>

                {/* Add Button */}
                <button
                  type="button"
                  onClick={() => onSelectColor(color)}
                  className="w-full py-2.5 px-3 bg-[#2d3a2e] hover:bg-emerald-600 hover:text-white text-slate-300 font-heading font-bold text-xs uppercase tracking-wider transition-colors border-t border-slate-700/80 flex items-center justify-center gap-1"
                >
                  <span>ADD →</span>
                  <span className="font-mono">{newCount}/{meta?.setSize}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
