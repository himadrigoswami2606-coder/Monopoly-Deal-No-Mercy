import React from 'react';
import { Card, CardType } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { ActionIcon, MoneyBanknotePattern } from './CardIcons';

interface CardViewProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  isPlayable?: boolean;
  onPlay?: (card: Card) => void;
  onBank?: (card: Card) => void;
  selected?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  size = 'md',
  isPlayable = false,
  onPlay,
  onBank,
  selected = false,
}) => {
  const isProperty = card.type === CardType.PROPERTY;
  const isWildcard = card.type === CardType.PROPERTY_WILDCARD;
  const isMoney = card.type === CardType.MONEY;
  const isAction = card.type === CardType.ACTION;

  const colorMeta = card.color ? PROPERTY_CONFIG[card.color] : null;

  // Dimensions & typography scaling
  const sizeClasses = {
    sm: 'w-28 h-44 text-[11px]',
    md: 'w-40 h-60 text-xs',
    lg: 'w-48 h-72 text-sm',
  }[size];

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl overflow-hidden border-2 transition-all duration-200 select-none shadow-lg ${sizeClasses} ${
        selected ? 'ring-4 ring-amber-400 scale-105 z-20 shadow-2xl' : ''
      } ${
        isPlayable
          ? 'hover:-translate-y-2 hover:shadow-2xl hover:border-amber-400 cursor-pointer'
          : 'border-slate-800'
      } ${
        isMoney
          ? 'bg-slate-900 border-emerald-500/60'
          : isAction
          ? 'bg-slate-900 border-amber-600/60'
          : isWildcard
          ? 'bg-slate-900 border-indigo-500/60'
          : 'bg-slate-900 border-slate-700'
      }`}
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. PROPERTY CARD HEADER                                           */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isProperty && colorMeta && (
        <div
          className="w-full py-2 px-2 text-center border-b-2 border-slate-950 shadow-md relative"
          style={{ backgroundColor: colorMeta.hexColor, color: colorMeta.textColor }}
        >
          <div className="font-heading uppercase tracking-wider font-extrabold text-[12px] md:text-[13px] drop-shadow-sm truncate">
            {colorMeta.name}
          </div>
          <div className="text-[9px] font-sans font-bold opacity-90 uppercase tracking-widest">
            Property
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. WILDCARD HEADER                                                */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isWildcard && (
        <div className="w-full py-1.5 px-2 text-center border-b-2 border-slate-950 shadow-md relative">
          {card.isRainbow ? (
            <div className="bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 to-purple-600 text-white font-heading font-black tracking-widest text-[11px] uppercase py-0.5 rounded shadow">
              ★ 10-COLOR RAINBOW ★
            </div>
          ) : (
            <div className="flex h-6 rounded overflow-hidden border border-black/40">
              {card.colors?.map((c) => (
                <div
                  key={c}
                  className="flex-1 flex items-center justify-center font-heading font-bold text-[10px] uppercase tracking-wider"
                  style={{
                    backgroundColor: PROPERTY_CONFIG[c]?.hexColor,
                    color: PROPERTY_CONFIG[c]?.textColor,
                  }}
                >
                  {PROPERTY_CONFIG[c]?.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. MONEY BANKNOTE HEADER                                          */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isMoney && (
        <div className="w-full py-1.5 px-2 bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800 text-white border-b-2 border-emerald-950 flex items-center justify-between text-[10px] font-heading font-black tracking-widest uppercase">
          <span>MONOPOLY</span>
          <span className="text-emerald-200">BANK OF M</span>
          <span>${card.cashValue}M</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. ACTION CARD HEADER                                             */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isAction && (
        <div className="w-full py-1 px-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 border-b-2 border-amber-950 flex items-center justify-between font-heading font-black tracking-wider text-[11px] uppercase">
          <span>ACTION</span>
          <span className="text-[9px] font-sans font-bold bg-slate-950/20 px-1 rounded">NO MERCY</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* CARD BODY CONTENT                                                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-2 text-center bg-gradient-to-b from-slate-900/90 to-slate-950">
        {/* Name Title */}
        <div className="mt-0.5">
          <div className="font-heading font-bold text-slate-100 tracking-wide text-xs md:text-sm uppercase leading-tight line-clamp-2">
            {card.name}
          </div>
        </div>

        {/* Central Display */}
        <div className="my-auto py-1">
          {/* Property Rent Table */}
          {isProperty && (
            <div className="bg-slate-950/80 rounded-lg p-1.5 border border-slate-800 text-[10px] space-y-0.5 shadow-inner">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-0.5 mb-1">
                Rent Scale (Set Size: {card.setSize})
              </div>
              {card.rentValues?.map((rent, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] px-1">
                  <span className="text-slate-300">
                    {idx + 1} {PROPERTY_CONFIG[card.color!]?.name}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">${rent}M</span>
                </div>
              ))}
              <div className="pt-1 mt-1 border-t border-slate-800/80 text-[8px] text-slate-400 flex justify-between px-1">
                <span>House: +$3M</span>
                <span>Hotel: +$4M</span>
              </div>
            </div>
          )}

          {/* Money Banknote Artwork */}
          {isMoney && (
            <div className="relative h-24 my-auto flex items-center justify-center text-emerald-400">
              <MoneyBanknotePattern value={card.cashValue} />
            </div>
          )}

          {/* Action Emblem & Description */}
          {isAction && (
            <div className="flex flex-col items-center">
              <div className="my-1 drop-shadow-md">
                {card.actionType && <ActionIcon type={card.actionType} className="w-10 h-10 md:w-12 md:h-12" />}
              </div>
              <div className="text-[10px] text-slate-300 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80 leading-snug italic mt-1">
                {card.description || 'Action card'}
              </div>
            </div>
          )}

          {/* Wildcard Info */}
          {isWildcard && (
            <div className="text-[10px] text-indigo-200 bg-indigo-950/50 p-2 rounded-lg border border-indigo-900/50 space-y-1">
              {card.isRainbow ? (
                <>
                  <div className="font-bold text-amber-300 text-xs">Wildcard Joker</div>
                  <div className="text-[9px] text-slate-300">
                    Can be played with ANY color set on your board!
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-slate-200 text-xs">Dual Wildcard</div>
                  <div className="text-[9px] text-slate-300">
                    Matches either {card.colors?.map((c) => PROPERTY_CONFIG[c]?.name).join(' or ')}.
                  </div>
                  <div className="text-[8px] text-indigo-300 italic">
                    Can be flipped between sets on your turn!
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Playable Action Buttons */}
        {isPlayable && (
          <div className="mt-1 flex flex-col gap-1 z-10 pt-1 border-t border-slate-800/60">
            {isAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(card);
                }}
                className="w-full py-1 text-[11px] font-heading font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md active:scale-95 uppercase tracking-wider"
              >
                Play Action
              </button>
            )}

            {(isProperty || isWildcard) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(card);
                }}
                className="w-full py-1 text-[11px] font-heading font-bold rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white transition-all shadow-md active:scale-95 uppercase tracking-wider"
              >
                Lay Down Property
              </button>
            )}

            {isMoney && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(card);
                }}
                className="w-full py-1 text-[11px] font-heading font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white transition-all shadow-md active:scale-95 uppercase tracking-wider"
              >
                Deposit in Bank
              </button>
            )}

            {isAction && onBank && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBank(card);
                }}
                className="w-full py-0.5 text-[10px] font-semibold rounded bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 transition-colors"
              >
                Bank as ${card.cashValue}M Cash
              </button>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 5. BOTTOM CORNER CASH VALUE SEAL                                  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-950 px-2.5 py-1 border-t border-slate-800/80 flex justify-between items-center text-[10px]">
        <span className="text-slate-400 font-mono font-bold tracking-widest text-[9px]">VALUE</span>
        <span className="font-heading font-extrabold text-emerald-400 text-xs tracking-wider">
          ${card.cashValue}M
        </span>
      </div>
    </div>
  );
};
