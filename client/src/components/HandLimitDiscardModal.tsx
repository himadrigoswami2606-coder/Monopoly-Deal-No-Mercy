import React, { useState } from 'react';
import { Card } from '../../../shared/types';
import { CardView } from './CardView';

interface HandLimitDiscardModalProps {
  hand: Card[];
  excessCount: number;
  onConfirmDiscard: (discardCardIds: string[]) => void;
  onCancel: () => void;
}

export const HandLimitDiscardModal: React.FC<HandLimitDiscardModalProps> = ({
  hand,
  excessCount,
  onConfirmDiscard,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (cardId: string) => {
    const next = new Set(selectedIds);
    if (next.has(cardId)) {
      next.delete(cardId);
    } else {
      if (next.size < excessCount) {
        next.add(cardId);
      }
    }
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    if (selectedIds.size === excessCount) {
      onConfirmDiscard(Array.from(selectedIds));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl w-full bg-[#142319] border-2 border-amber-400 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="pb-3 border-b border-[#1f4d36] mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗑️</span>
              <div>
                <h3 className="font-heading font-black text-base uppercase text-amber-400">
                  Hand Limit Exceeded (7 Cards Max)
                </h3>
                <p className="text-[11px] text-slate-300">
                  According to official Monopoly Deal rules, you can only hold up to 7 cards at the end of your turn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#0b1c14] p-3 rounded-2xl border border-[#1f4d36] text-xs text-amber-200/90 mb-3 flex items-center justify-between">
          <span>
            You hold <strong>{hand.length} cards</strong>. Choose <strong>{excessCount} card{excessCount > 1 ? 's' : ''}</strong> of your own choice to discard:
          </span>
          <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-400/30">
            Selected {selectedIds.size} / {excessCount}
          </span>
        </div>

        {/* Hand Cards Grid */}
        <div className="flex-1 overflow-y-auto max-h-72 p-2 bg-[#091710] rounded-2xl border border-[#1b3d2b] mb-4">
          <div className="flex flex-wrap justify-center gap-2.5">
            {hand.map((card) => {
              const isSelected = selectedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleSelect(card.id)}
                  className={`cursor-pointer transition-all transform hover:scale-105 rounded-xl p-1 relative ${
                    isSelected
                      ? 'ring-4 ring-rose-500 bg-rose-500/20 scale-105 shadow-xl shadow-rose-500/30 z-20'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <CardView card={card} size="sm" />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-white">
                      ✕
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t border-[#1f4d36]">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 px-4 rounded-xl font-bold text-slate-400 hover:text-white bg-[#0f281d] border border-slate-700 text-xs uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size !== excessCount}
            className="w-2/3 py-2.5 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all shadow-lg text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-300 active:scale-95"
          >
            Discard {selectedIds.size} Card{excessCount > 1 ? 's' : ''} & End Turn
          </button>
        </div>
      </div>
    </div>
  );
};
