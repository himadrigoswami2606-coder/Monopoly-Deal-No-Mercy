import React from 'react';
import { Card, CardType } from '../../../shared/types';

interface MiniBankStackProps {
  totalAmount: number;
  cards: Card[];
  playerName?: string;
  isSelf?: boolean;
  onClick?: () => void;
}

export const MiniBankStack: React.FC<MiniBankStackProps> = ({
  totalAmount,
  cards,
  playerName = 'Player',
  isSelf = false,
  onClick,
}) => {
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
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="relative flex items-center gap-2 group cursor-pointer p-1 rounded-xl hover:bg-white/5 active:scale-95 transition-all select-none"
      title={`Click to view all ${cards.length} cards in ${isSelf ? 'your' : playerName + "'s"} bank ($${totalAmount}M)`}
    >
      {/* Mini Bank Card / Clean 3D Parallel Stack Visual (Point 2: Clean visual, no messy wireframes) */}
      <div className="relative">
        {/* Crisp parallel layered card stack */}
        {cards.length > 2 && (
          <div className="absolute -top-1.5 -left-1.5 w-[52px] h-[76px] rounded-lg bg-slate-800/90 border border-slate-600/70 shadow-sm pointer-events-none" />
        )}
        {cards.length > 1 && (
          <div className="absolute -top-0.5 -left-0.5 w-[52px] h-[76px] rounded-lg bg-slate-900 border border-slate-500/80 shadow pointer-events-none" />
        )}

        {topCard ? (
          (() => {
            const style = getCardStyle(topCard);
            return (
              <div
                className={`relative z-10 w-[52px] h-[76px] rounded-lg border shadow-md flex flex-col justify-between p-1 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg ${style.bg} ${style.border} ${style.text}`}
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
          <div className="relative z-10 w-[52px] h-[76px] rounded-lg border-2 border-dashed border-[#1f4d36] bg-[#081a12]/80 flex flex-col items-center justify-center p-1 text-slate-500">
            <span className="text-base opacity-40">🏦</span>
            <span className="text-[7.5px] font-mono uppercase text-center mt-1">Empty</span>
          </div>
        )}
      </div>

      {/* Details beside card */}
      <div className="flex flex-col pr-1">
        <div className="text-[9px] font-heading font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <span>🏦 BANK</span>
        </div>
        <div className="font-mono font-black text-xs text-emerald-400 leading-tight">
          ${totalAmount}M
        </div>
        <div className="text-[9.5px] text-slate-400 font-mono">
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
        </div>
        <div className="text-[8px] text-amber-400/90 font-bold tracking-tight mt-0.5 flex items-center gap-0.5">
          <span>👁️ Inspect</span>
        </div>
      </div>
    </div>
  );
};
