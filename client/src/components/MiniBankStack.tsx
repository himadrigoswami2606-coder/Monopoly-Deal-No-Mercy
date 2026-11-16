import React, { useState } from 'react';
import { Card, CardType } from '../../../shared/types';

interface MiniBankStackProps {
  totalAmount: number;
  cards: Card[];
  playerName?: string;
  isSelf?: boolean;
}

export const MiniBankStack: React.FC<MiniBankStackProps> = ({
  totalAmount,
  cards,
  playerName = 'Player',
  isSelf = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Latest / top card in bank
  const topCard = cards && cards.length > 0 ? cards[cards.length - 1] : null;

  // Money colors
  const moneyColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-[#cbd5e1]', text: 'text-slate-900', border: 'border-slate-400' },
    2: { bg: 'bg-[#fed7aa]', text: 'text-amber-950', border: 'border-amber-400' },
    3: { bg: 'bg-[#2d6a4f]', text: 'text-white', border: 'border-emerald-400' },
    4: { bg: 'bg-[#0284c7]', text: 'text-white', border: 'border-sky-300' },
    5: { bg: 'bg-[#7c3aed]', text: 'text-white', border: 'border-purple-300' },
    10: { bg: 'bg-[#ca8a04]', text: 'text-white', border: 'border-yellow-200' },
  };

  const getCardStyle = (card: Card) => {
    if (card.type === CardType.MONEY) {
      return moneyColors[card.cashValue] || moneyColors[1];
    }
    // Action banked as cash
    return { bg: 'bg-[#faf8f5]', text: 'text-slate-900', border: 'border-amber-400/80' };
  };

  return (
    <div
      className="relative flex items-center gap-2 group cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={`${playerName}'s Bank: $${totalAmount}M (${cards.length} cards)`}
    >
      {/* Mini Bank Card / Stack Visual */}
      <div className="relative">
        {/* Background stack layers if > 1 card */}
        {cards.length > 2 && (
          <div className="absolute -top-1.5 -left-1.5 w-[52px] h-[76px] rounded-lg bg-black/40 border border-[#1f4d36] -rotate-6 pointer-events-none" />
        )}
        {cards.length > 1 && (
          <div className="absolute -top-0.5 -left-0.5 w-[52px] h-[76px] rounded-lg bg-black/50 border border-[#1f4d36] rotate-3 pointer-events-none" />
        )}

        {topCard ? (
          (() => {
            const style = getCardStyle(topCard);
            return (
              <div
                className={`w-[52px] h-[76px] rounded-lg border shadow-md flex flex-col justify-between p-1 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg ${style.bg} ${style.border} ${style.text}`}
              >
                <div className="flex items-center justify-between text-[7px] font-mono font-black uppercase tracking-tight opacity-80">
                  <span>{topCard.type === CardType.MONEY ? 'CASH' : 'BANKED'}</span>
                  <span>${topCard.cashValue}M</span>
                </div>

                <div className="my-auto text-center">
                  <div className="font-heading font-black text-sm tracking-tighter leading-none drop-shadow-sm">
                    ${topCard.cashValue}M
                  </div>
                  <div className="text-[6.5px] uppercase font-bold tracking-widest opacity-75 truncate mt-0.5">
                    {topCard.type === CardType.MONEY ? 'MONOPOLY' : topCard.name}
                  </div>
                </div>

                <div className="text-[6.5px] font-mono font-bold text-center bg-black/10 rounded py-0.2">
                  TOP CARD
                </div>
              </div>
            );
          })()
        ) : (
          <div className="w-[52px] h-[76px] rounded-lg border-2 border-dashed border-[#1f4d36] bg-[#081a12]/80 flex flex-col items-center justify-center p-1 text-slate-500">
            <span className="text-base opacity-40">🏦</span>
            <span className="text-[7.5px] font-mono uppercase text-center mt-1">Empty</span>
          </div>
        )}
      </div>

      {/* Details beside card */}
      <div className="flex flex-col">
        <div className="text-[9px] font-heading font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <span>🏦 BANK</span>
        </div>
        <div className="font-mono font-black text-xs text-emerald-400 leading-tight">
          ${totalAmount}M
        </div>
        <div className="text-[9.5px] text-slate-400 font-mono">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
        </div>
      </div>

      {/* Hover Dropdown / Tooltip listing all banked cards */}
      {showTooltip && cards.length > 0 && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-[#081a12]/95 border border-amber-400/60 rounded-2xl p-3 shadow-2xl backdrop-blur-md min-w-[180px] max-w-xs animate-fade-in pointer-events-none">
          <div className="text-[10px] uppercase font-heading font-bold text-amber-300 pb-1.5 border-b border-[#1f4d36] mb-1.5 flex justify-between">
            <span>{isSelf ? 'Your Bank' : `${playerName}'s Bank`}</span>
            <span className="text-emerald-400 font-mono">${totalAmount}M</span>
          </div>
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            {cards.map((c, i) => (
              <div
                key={c.id || i}
                className="flex items-center justify-between text-[10px] text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/5"
              >
                <span className="truncate pr-2">
                  {c.name} {i === cards.length - 1 ? '★' : ''}
                </span>
                <span className="font-mono font-bold text-emerald-400 flex-shrink-0">
                  ${c.cashValue}M
                </span>
              </div>
            ))}
          </div>
          <div className="text-[8px] text-slate-500 text-center mt-1.5 pt-1 border-t border-[#1f4d36]">
            ★ = Top / Latest deposited card
          </div>
        </div>
      )}
    </div>
  );
};
