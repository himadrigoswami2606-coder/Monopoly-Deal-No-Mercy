import React, { useState } from 'react';
import { Card, Player } from '../../../shared/types';
import { CardView } from './CardView';

interface ActionReactionModalProps {
  attackerName: string;
  cardName: string;
  demandDescription: string;
  amountDue: number;
  status: 'AWAITING_JSN' | 'AWAITING_PAYMENT';
  myPlayer: Player;
  hasJustSayNo: boolean;
  onPayCards: (selectedCardIds: string[], surrenderDebtChip?: boolean) => void;
  onJustSayNo: () => void;
  onAcceptAction: () => void;
}

export const ActionReactionModal: React.FC<ActionReactionModalProps> = ({
  attackerName,
  cardName,
  demandDescription,
  amountDue,
  status,
  myPlayer,
  hasJustSayNo,
  onPayCards,
  onJustSayNo,
  onAcceptAction,
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Available assets
  const bankCards = myPlayer.bank;
  const propertyCards = myPlayer.properties.flatMap((s) => s.cards);
  const totalAssets = [...bankCards, ...propertyCards];
  const totalAssetsValue = totalAssets.reduce((sum, c) => sum + (c.cashValue || 0), 0);

  const toggleSelectCard = (card: Card) => {
    const next = new Set(selectedCardIds);
    if (next.has(card.id)) {
      next.delete(card.id);
    } else {
      next.add(card.id);
    }
    setSelectedCardIds(next);
  };

  const totalSelectedValue = totalAssets
    .filter((c) => selectedCardIds.has(c.id))
    .reduce((sum, c) => sum + (c.cashValue || 0), 0);

  const isInsolvent = totalAssetsValue < amountDue;
  const canPay =
    totalSelectedValue >= amountDue ||
    (isInsolvent && selectedCardIds.size === totalAssets.length);

  const handleConfirmPayment = () => {
    onPayCards(Array.from(selectedCardIds), isInsolvent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-xl w-full bg-[#1b231c] border-2 border-amber-500/80 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="font-heading font-extrabold text-lg uppercase tracking-wide text-amber-400">
              {status === 'AWAITING_PAYMENT' ? 'Rent / Payment Demanded!' : 'Action Played Against You!'}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-500/30">
            {cardName}
          </span>
        </div>

        {/* ── MODE 1: AWAITING JUST SAY NO REACTION ──────────────────────── */}
        {status === 'AWAITING_JSN' && (
          <div className="space-y-4 my-2">
            <div className="bg-[#0e2a1e] p-4 rounded-2xl border border-amber-500/40 text-center space-y-2">
              <div className="text-sm font-heading font-bold text-slate-100 uppercase">
                <strong className="text-amber-400">{attackerName}</strong> played{' '}
                <strong className="text-amber-300">{cardName}</strong> against you!
              </div>
              <p className="text-xs text-slate-300">
                {demandDescription || 'An action card has been initiated against you. Do you want to block it with Just Say No?'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onJustSayNo}
                disabled={!hasJustSayNo}
                className={`py-3 px-4 rounded-2xl font-heading font-black text-xs uppercase tracking-wider transition-all shadow ${
                  hasJustSayNo
                    ? 'bg-[#5c1d1d] hover:bg-[#782525] text-white border border-red-500 ring-2 ring-red-500/30 animate-pulse'
                    : 'bg-slate-900 border border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                }`}
              >
                {hasJustSayNo ? '🛑 Play JUST SAY NO!' : 'No Just Say No Card'}
              </button>

              <button
                type="button"
                onClick={onAcceptAction}
                className="py-3 px-4 rounded-2xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95"
              >
                Accept Action ➔
              </button>
            </div>
          </div>
        )}

        {/* ── MODE 2: INTERACTIVE PAYMENT DEMAND (Matches Screenshot 2) ─── */}
        {status === 'AWAITING_PAYMENT' && (
          <div>
            <div className="text-sm font-heading font-bold text-slate-100 uppercase mb-1">
              {attackerName} demands ${amountDue}M!
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Select cards to pay with (${totalSelectedValue}M / ${amountDue}M):
            </p>

            {/* 1. BANK CARDS SECTION */}
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>From Your Bank ({bankCards.length} cards):</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ${bankCards.reduce((s, c) => s + c.cashValue, 0)}M Available
                </span>
              </div>

              {bankCards.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                  Your Bank is empty
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 px-1">
                  {bankCards.map((card) => {
                    const isSelected = selectedCardIds.has(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleSelectCard(card)}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <CardView card={card} size="sm" selected={isSelected} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. PROPERTIES SECTION */}
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>From Your Properties ({propertyCards.length} cards):</span>
                <span className="text-slate-400 text-[10px]">Properties can be surrendered as payment</span>
              </div>

              {propertyCards.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                  No properties laid down
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 px-1">
                  {propertyCards.map((card) => {
                    const isSelected = selectedCardIds.has(card.id);
                    return (
                      <div
                        key={card.id}
                        onClick={() => toggleSelectCard(card)}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <CardView card={card} size="sm" selected={isSelected} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. INSOLVENCY / DEBT CHIP NOTICE */}
            {isInsolvent && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-center">
                <div className="text-rose-400 font-bold text-xs uppercase mb-1">
                  ⚠️ Insolvent: Total Assets (${totalAssetsValue}M) &lt; Demanded (${amountDue}M)
                </div>
                <div className="text-[11px] text-slate-300">
                  Select all your available assets (${totalAssetsValue}M). You must also surrender <strong>1 Debt Chip</strong> to {attackerName}!
                </div>
              </div>
            )}

            {/* Bottom Buttons: Pay vs Just Say No */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={!canPay}
                className="py-3 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:pointer-events-none border border-slate-700"
              >
                Pay (${totalSelectedValue}M / ${amountDue}M)
              </button>

              <button
                type="button"
                onClick={onJustSayNo}
                disabled={!hasJustSayNo}
                className={`py-3 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow ${
                  hasJustSayNo
                    ? 'bg-[#5c1d1d] hover:bg-[#782525] text-white border border-red-500/50 ring-2 ring-red-500/30 animate-pulse'
                    : 'bg-slate-900 border border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                }`}
              >
                {hasJustSayNo ? 'Just Say No! ✋' : 'Just Say No (None)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
