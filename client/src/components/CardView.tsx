import React from 'react';
import { Card, CardType } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { ActionIcon } from './CardIcons';

interface CardViewProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  isPlayable?: boolean;
  onPlay?: (card: Card) => void;
  onBank?: (card: Card) => void;
  selected?: boolean;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  size = 'md',
  isPlayable = false,
  onPlay,
  onBank,
  selected = false,
  className = '',
}) => {
  const isProperty = card.type === CardType.PROPERTY;
  const isWildcard = card.type === CardType.PROPERTY_WILDCARD;
  const isMoney = card.type === CardType.MONEY;
  const isAction = card.type === CardType.ACTION;

  const colorMeta = card.color ? PROPERTY_CONFIG[card.color] : null;

  // Authentic Money Color Schemes
  const moneyColors: Record<number, { bg: string; text: string; border: string; header: string }> = {
    1: { bg: 'bg-[#e2e8f0]', text: 'text-[#1e293b]', border: 'border-slate-400', header: 'bg-slate-500' },
    2: { bg: 'bg-[#ffedd5]', text: 'text-[#9a3412]', border: 'border-amber-400', header: 'bg-amber-600' },
    3: { bg: 'bg-[#2d6a4f]', text: 'text-[#ffffff]', border: 'border-emerald-500', header: 'bg-[#1b4332]' },
    4: { bg: 'bg-[#0284c7]', text: 'text-[#ffffff]', border: 'border-sky-400', header: 'bg-sky-800' },
    5: { bg: 'bg-[#7c3aed]', text: 'text-[#ffffff]', border: 'border-purple-400', header: 'bg-purple-900' },
    10: { bg: 'bg-[#ca8a04]', text: 'text-[#ffffff]', border: 'border-yellow-300', header: 'bg-yellow-700' },
  };

  const moneyStyle = isMoney ? moneyColors[card.cashValue] || moneyColors[1] : null;

  // Dimensions
  const sizeClasses = {
    sm: 'w-[110px] h-[168px] text-[10px]',
    md: 'w-[140px] h-[210px] text-xs',
    lg: 'w-[170px] h-[255px] text-sm',
  }[size];

  // Dual wildcard colors
  const wildColor1 = card.colors?.[0] ? PROPERTY_CONFIG[card.colors[0]] : null;
  const wildColor2 = card.colors?.[1] ? PROPERTY_CONFIG[card.colors[1]] : null;

  return (
    <div
      onClick={isPlayable && !onBank ? () => onPlay?.(card) : undefined}
      className={`relative rounded-xl overflow-hidden shadow-md flex flex-col justify-between transition-all duration-200 select-none border border-black/25 ${sizeClasses} ${
        selected ? 'ring-4 ring-yellow-400 scale-105 z-30 shadow-2xl' : ''
      } ${
        isPlayable
          ? 'cursor-pointer'
          : ''
      } ${
        isMoney
          ? `${moneyStyle?.bg} text-slate-900`
          : 'bg-[#faf8f5] text-slate-900'
      } ${className}`}
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. PROPERTY CARD: REAL-LIFE MONOPOLY DEAL STYLE                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isProperty && colorMeta && (
        <div className="flex-1 flex flex-col justify-between p-1.5 bg-[#faf8f5]">
          {/* Top Color Band */}
          <div
            className="w-full py-1.5 px-2 rounded-t-lg border border-black/30 flex items-center justify-between text-white shadow-sm"
            style={{ backgroundColor: colorMeta.hexColor, color: colorMeta.textColor }}
          >
            <span className="font-heading font-black text-[11px] tracking-wider">
              ${card.cashValue}M
            </span>
            <span className="font-heading font-extrabold text-[11px] tracking-wide uppercase truncate pl-1">
              {card.name}
            </span>
          </div>

          {/* Authentic Boxed Rent Scale Ladder */}
          <div className="my-auto bg-[#f5f2eb] rounded-lg border border-slate-300 p-1.5 shadow-inner">
            <div className="text-[9px] uppercase font-heading font-bold text-slate-500 tracking-wider text-center border-b border-slate-300 pb-0.5 mb-1">
              RENT
            </div>
            <div className="space-y-0.5">
              {card.rentValues?.map((rent, idx) => {
                const isCompleteRow = idx === (card.rentValues?.length || 1) - 1;
                return (
                  <div
                    key={idx}
                    className={`flex justify-between items-center px-1 rounded text-[10px] ${
                      isCompleteRow ? 'bg-amber-100 font-bold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <span>
                      {idx + 1} {isCompleteRow ? '★' : ''}
                    </span>
                    <span className="font-heading font-bold">${rent}M</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Card Footer */}
          <div className="flex justify-between items-center text-[9px] text-slate-500 px-1 border-t border-slate-200 pt-0.5 font-sans font-medium">
            <span>Set: {card.setSize}</span>
            <span className="font-heading font-bold text-slate-700">${card.cashValue}M</span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. DUAL-COLOR WILDCARD (WITH REAL INVERTED BOTTOM BAND)            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isWildcard && !card.isRainbow && wildColor1 && wildColor2 && (
        <div className="flex-1 flex flex-col justify-between p-1.5 bg-[#faf8f5]">
          {/* Top Color Band */}
          <div
            className="w-full py-1 px-1.5 rounded-t-lg border border-black/30 flex items-center justify-between text-white shadow-sm"
            style={{ backgroundColor: wildColor1.hexColor, color: wildColor1.textColor }}
          >
            <span className="font-heading font-black text-[10px]">${card.cashValue}M</span>
            <span className="font-heading font-bold text-[10px] uppercase truncate">{wildColor1.name}</span>
          </div>

          {/* Center Dual Rent Table */}
          <div className="my-auto bg-[#f5f2eb] rounded p-1 border border-slate-300 text-center shadow-inner">
            <div className="text-[8px] font-heading font-bold text-slate-500 uppercase tracking-widest border-b border-slate-300 pb-0.5 mb-0.5">
              WILDCARD
            </div>
            <div className="text-[9px] text-slate-600 leading-tight">
              Play with either <strong className="text-slate-900">{wildColor1.name}</strong> or <strong className="text-slate-900">{wildColor2.name}</strong>
            </div>
          </div>

          {/* Real-life Monopoly Deal Inverted Bottom Color Band (Rotated 180deg) */}
          <div
            className="w-full py-1 px-1.5 rounded-b-lg border border-black/30 flex items-center justify-between text-white shadow-sm rotate-180"
            style={{ backgroundColor: wildColor2.hexColor, color: wildColor2.textColor }}
          >
            <span className="font-heading font-black text-[10px]">${card.cashValue}M</span>
            <span className="font-heading font-bold text-[10px] uppercase truncate">{wildColor2.name}</span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. MULTI-COLOR RAINBOW WILDCARD                                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isWildcard && card.isRainbow && (
        <div className="flex-1 flex flex-col justify-between p-1.5 bg-[#faf8f5]">
          {/* Rainbow Top Band */}
          <div className="w-full py-1 px-2 rounded-t-lg bg-gradient-to-r from-red-600 via-yellow-400 via-green-500 to-blue-600 text-white font-heading font-black text-[10px] uppercase tracking-widest text-center shadow-sm">
            ALL PROPERTIES
          </div>

          {/* Center Rainbow Starburst */}
          <div className="my-auto text-center p-2 bg-[#f5f2eb] rounded-lg border border-slate-300">
            <div className="text-2xl mb-0.5">🌈</div>
            <div className="font-heading font-extrabold text-xs text-slate-800 uppercase tracking-wide">
              Wildcard Joker
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              Usable with ANY set!
            </div>
          </div>

          <div className="w-full py-1 px-2 rounded-b-lg bg-gradient-to-r from-blue-600 via-green-500 via-yellow-400 to-red-600 text-white font-heading font-black text-[10px] uppercase tracking-widest text-center shadow-sm rotate-180">
            ALL PROPERTIES
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. MONEY BANKNOTE: CRISP REAL-LIFE STYLE (LIKE SCREENSHOTS)       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isMoney && moneyStyle && (
        <div className="flex-1 flex flex-col justify-between p-2">
          {/* Top Money Bar */}
          <div className="flex justify-between items-center text-[10px] font-heading font-bold tracking-widest uppercase opacity-80">
            <span>MONEY</span>
            <span>${card.cashValue}M</span>
          </div>

          {/* Large Bold Center Denomination (Identical to reference screenshot!) */}
          <div className="my-auto text-center">
            <div className="font-heading font-black text-3xl md:text-4xl tracking-tighter drop-shadow-sm leading-none">
              ${card.cashValue}M
            </div>
          </div>

          {/* Bottom Denomination */}
          <div className="flex justify-between items-center text-[10px] font-heading font-bold tracking-widest uppercase opacity-80">
            <span>${card.cashValue}M</span>
            <span>MONOPOLY</span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 5. ACTION CARD: AUTHENTIC MONOPOLY DEAL STYLE                     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isAction && (
        <div className="flex-1 flex flex-col justify-between p-1.5 bg-[#faf8f5]">
          {/* Action Header Banner */}
          <div className="w-full py-1 px-2 rounded-t-lg bg-slate-900 text-white flex justify-between items-center font-heading font-black text-[10px] tracking-wider uppercase border border-black">
            <span>ACTION</span>
            <span className="text-amber-400">${card.cashValue}M</span>
          </div>

          {/* Action Title */}
          <div className="mt-1 font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wide leading-tight text-center">
            {card.name}
          </div>

          {/* Center Emblem Artwork */}
          <div className="my-auto flex items-center justify-center py-1">
            {card.actionType && <ActionIcon type={card.actionType} className="w-8 h-8 md:w-10 md:h-10" />}
          </div>

          {/* Description Box */}
          <div className="bg-[#f5f2eb] rounded p-1 text-[9px] text-slate-700 leading-tight border border-slate-300 text-center font-medium">
            {card.description}
          </div>

          {/* Bottom Cash Seal */}
          <div className="flex justify-between items-center text-[9px] text-slate-500 px-1 border-t border-slate-200 pt-0.5 font-sans font-medium">
            <span>Bank Value:</span>
            <span className="font-heading font-bold text-emerald-700">${card.cashValue}M</span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 6. PLAY / BANK CONTROLS ON HOVER                                  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isPlayable && (
        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-slate-950/90 flex flex-col gap-1 z-30 rounded-b-xl opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(card);
            }}
            className="w-full py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-heading font-bold text-[10px] uppercase tracking-wider shadow"
          >
            {isMoney ? 'Deposit' : isProperty ? 'Lay Down' : 'Play Card'}
          </button>
          {isAction && onBank && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBank(card);
              }}
              className="w-full py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-[9px] uppercase tracking-wider shadow"
            >
              Bank (${card.cashValue}M)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
