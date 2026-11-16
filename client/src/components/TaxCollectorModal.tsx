import React, { useState } from 'react';
import { Card, Player, PublicPlayerView } from '../../../shared/types';

interface TaxCollectorModalProps {
  attackerName: string;
  myPlayer: Player;
  otherPlayers: PublicPlayerView[]; // All other opponents + attacker
  hasJustSayNo: boolean;
  onJustSayNo: () => void;
  onConfirmTaxCollector: (
    keepCardId: string,
    distributions: { cardId: string; targetPlayerId: string }[]
  ) => void;
}

export const TaxCollectorModal: React.FC<TaxCollectorModalProps> = ({
  attackerName,
  myPlayer,
  otherPlayers,
  hasJustSayNo,
  onJustSayNo,
  onConfirmTaxCollector,
}) => {
  const bankCards: Card[] = myPlayer.bank;

  // 1 bank card chosen to KEEP
  const [keepCardId, setKeepCardId] = useState<string>(bankCards[0]?.id || '');

  // Distribution mapping: cardId -> targetPlayerId
  const [distributions, setDistributions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const defaultRecipient = otherPlayers[0]?.id || '';
    bankCards.forEach((c) => {
      initial[c.id] = defaultRecipient;
    });
    return initial;
  });

  const handleSelectKeep = (cardId: string) => {
    setKeepCardId(cardId);
  };

  const handleSetRecipient = (cardId: string, recipientId: string) => {
    setDistributions((prev) => ({
      ...prev,
      [cardId]: recipientId,
    }));
  };

  const handleConfirm = () => {
    if (!keepCardId && bankCards.length > 0) return;
    const distList = bankCards
      .filter((c) => c.id !== keepCardId)
      .map((c) => ({
        cardId: c.id,
        targetPlayerId: distributions[c.id] || otherPlayers[0]?.id || '',
      }));
    onConfirmTaxCollector(keepCardId, distList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl w-full bg-[#132319] border-2 border-emerald-500 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f4d36] mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <div>
              <h3 className="font-heading font-black text-base uppercase text-emerald-400">
                Tax Collector! ({attackerName})
              </h3>
              <p className="text-[11px] text-slate-300">
                You must choose <strong>1 card to KEEP in your Bank</strong> and distribute all other bank cards to the other players.
              </p>
            </div>
          </div>
          {hasJustSayNo && (
            <button
              onClick={onJustSayNo}
              className="py-1.5 px-3 bg-[#5c1d1d] hover:bg-[#782525] border border-red-500 text-white font-heading font-bold text-xs rounded-xl shadow animate-pulse uppercase tracking-wider"
            >
              Just Say No! ✋
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-[#0b1c14] p-3 rounded-2xl border border-[#1f4d36] text-xs text-amber-200/90 mb-3">
          👉 Click <strong>KEEP</strong> on the single card you choose to keep in your Bank. For every other card, choose which player receives it.
        </div>

        {/* Bank Cards List */}
        <div className="flex-1 overflow-y-auto max-h-72 p-2 bg-[#091710] rounded-2xl border border-[#1b3d2b] space-y-2 mb-4">
          {bankCards.length <= 1 ? (
            <div className="text-center py-6 text-sm text-slate-400">
              You only have {bankCards.length} card in your Bank. You keep it and give away nothing!
            </div>
          ) : (
            bankCards.map((card) => {
              const isKept = card.id === keepCardId;
              const recipientId = distributions[card.id] || otherPlayers[0]?.id;

              return (
                <div
                  key={card.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    isKept
                      ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/30'
                      : 'bg-[#102419] border-[#1d4732]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-xs text-emerald-300">
                      ${card.cashValue}M
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{card.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cash Value: ${card.cashValue}M
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectKeep(card.id)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                        isKept
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {isKept ? '✓ Kept by You' : 'Keep'}
                    </button>

                    {!isKept && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Send to:</span>
                        <select
                          value={recipientId}
                          onChange={(e) => handleSetRecipient(card.id, e.target.value)}
                          className="bg-[#0b1c14] border border-[#24573d] text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        >
                          {otherPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1f4d36]">
          <div className="text-xs text-slate-300">
            {bankCards.length <= 1 ? (
              <span className="text-emerald-400 font-bold">Safe: You keep your only card!</span>
            ) : (
              <span>
                1 card kept, <strong>{bankCards.length - 1}</strong> cards distributed.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="py-2.5 px-6 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Confirm Distribution
          </button>
        </div>
      </div>
    </div>
  );
};
