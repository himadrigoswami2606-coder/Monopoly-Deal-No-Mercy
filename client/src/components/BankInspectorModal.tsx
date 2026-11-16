import React from 'react';
import { Card } from '../../../shared/types';
import { CardView } from './CardView';

interface BankInspectorModalProps {
  playerName: string;
  totalAmount: number;
  cards: Card[];
  isSelf: boolean;
  onClose: () => void;
}

export const BankInspectorModal: React.FC<BankInspectorModalProps> = ({
  playerName,
  totalAmount,
  cards,
  isSelf,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full bg-slate-900 border-2 border-emerald-500 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            <div>
              <div className="font-heading font-extrabold text-base md:text-lg uppercase tracking-wider text-emerald-400">
                {isSelf ? 'Your Bank Vault' : `${playerName}'s Bank Vault`}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Total Cash: <span className="font-bold text-emerald-300">${totalAmount}M</span> • {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Cards Grid */}
        <div className="overflow-y-auto pr-1 flex-1 min-h-0">
          {cards.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">
              This bank is currently empty.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {cards.map((card, idx) => (
                <div key={card.id || idx} className="flex flex-col items-center">
                  <div className="transform scale-90 sm:scale-100 origin-top">
                    <CardView
                      card={card}
                      size="sm"
                      isPlayable={false}
                    />
                  </div>
                  {idx === cards.length - 1 && (
                    <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded-full mt-1">
                      ★ Top Card
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center flex-shrink-0 mt-3 text-xs text-slate-400">
          <span>Cards in bank can only be used to pay debts.</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl font-heading font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs uppercase tracking-wider transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
