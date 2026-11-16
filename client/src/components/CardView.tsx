import React from 'react';
import { Card, CardType } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';

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

  // Size styling
  const sizeClasses = {
    sm: 'w-24 h-36 text-xs',
    md: 'w-36 h-52 text-sm',
    lg: 'w-44 h-64 text-base',
  }[size];

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl overflow-hidden border-2 transition-all duration-200 select-none ${sizeClasses} ${
        selected ? 'ring-4 ring-amber-400 scale-105 z-20' : ''
      } ${isPlayable ? 'hover:-translate-y-2 hover:shadow-2xl hover:border-amber-400 cursor-pointer' : 'border-slate-700'} ${
        isMoney
          ? 'bg-gradient-to-b from-emerald-900/90 to-slate-900 border-emerald-500/50'
          : isAction
          ? 'bg-gradient-to-b from-amber-950/80 to-slate-900 border-amber-600/50'
          : isWildcard
          ? 'bg-gradient-to-b from-indigo-950/90 to-slate-900 border-indigo-400/50'
          : 'bg-slate-900 border-slate-700'
      }`}
    >
      {/* Top Banner / Color Header */}
      {isProperty && colorMeta && (
        <div
          className="w-full py-1.5 px-2 text-center font-bold tracking-wide border-b border-black/30 shadow-sm"
          style={{ backgroundColor: colorMeta.hexColor, color: colorMeta.textColor }}
        >
          <div className="truncate text-[11px] uppercase tracking-wider font-extrabold">{colorMeta.name}</div>
        </div>
      )}

      {isWildcard && (
        <div className="w-full py-1.5 px-2 text-center font-bold border-b border-black/30 bg-gradient-to-r from-blue-600 via-pink-600 to-amber-500 text-white">
          <div className="truncate text-[10px] uppercase font-extrabold tracking-widest">
            {card.isRainbow ? '★ RAINBOW WILD ★' : 'DUAL WILDCARD'}
          </div>
        </div>
      )}

      {isMoney && (
        <div className="w-full py-1 px-2 text-center font-bold border-b border-emerald-600/30 bg-emerald-700 text-white text-[11px] tracking-wider uppercase">
          Bank Cash
        </div>
      )}

      {isAction && (
        <div className="w-full py-1 px-2 text-center font-bold border-b border-amber-500/30 bg-amber-600 text-slate-950 text-[11px] uppercase tracking-wider font-extrabold">
          Action Card
        </div>
      )}

      {/* Card Body */}
      <div className="flex-1 flex flex-col justify-between p-2 text-center">
        {/* Card Name */}
        <div className="mt-1">
          <div className="font-bold text-slate-100 leading-snug break-words">
            {card.name}
          </div>
          {card.setSize && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Set size: {card.setSize}
            </div>
          )}
        </div>

        {/* Central Display / Artwork Placeholder */}
        <div className="my-auto py-1">
          {isMoney && (
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tighter drop-shadow-md">
              ${card.cashValue}M
            </div>
          )}

          {isProperty && (
            <div className="text-[10px] text-slate-300 space-y-0.5 bg-slate-950/60 p-1.5 rounded border border-slate-800">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Rent Scale</div>
              {card.rentValues?.map((rent, idx) => (
                <div key={idx} className="flex justify-between text-[10px] px-1">
                  <span>{idx + 1} card{idx > 0 ? 's' : ''}:</span>
                  <span className="font-bold text-emerald-400">${rent}M</span>
                </div>
              ))}
            </div>
          )}

          {isWildcard && (
            <div className="text-[10px] text-indigo-200 bg-indigo-950/60 p-1.5 rounded border border-indigo-900/60">
              {card.isRainbow ? (
                <span className="text-amber-300 font-bold">Usable as any property color</span>
              ) : (
                <span>
                  Matches:{' '}
                  {card.colors?.map((c) => PROPERTY_CONFIG[c]?.name).join(' or ')}
                </span>
              )}
            </div>
          )}

          {isAction && (
            <div className="text-[10px] text-slate-300 leading-tight bg-slate-950/70 p-1.5 rounded border border-amber-900/40 italic">
              {card.description || 'Special action card.'}
            </div>
          )}
        </div>

        {/* Action Buttons if in hand & interactive */}
        {isPlayable && (
          <div className="mt-1 flex flex-col gap-1 z-10">
            {isAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(card);
                }}
                className="w-full py-1 text-[11px] font-bold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow"
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
                className="w-full py-1 text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow"
              >
                Play to Set
              </button>
            )}

            {isMoney && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.(card);
                }}
                className="w-full py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow"
              >
                Bank Money
              </button>
            )}

            {isAction && onBank && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBank(card);
                }}
                className="w-full py-0.5 text-[10px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 transition-colors"
              >
                Bank (${card.cashValue}M)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Corner Cash Value Badge */}
      <div className="bg-slate-950/90 py-1 px-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
        <span className="text-slate-400 font-mono">VALUE</span>
        <span className="font-extrabold text-emerald-400 font-mono">${card.cashValue}M</span>
      </div>
    </div>
  );
};
