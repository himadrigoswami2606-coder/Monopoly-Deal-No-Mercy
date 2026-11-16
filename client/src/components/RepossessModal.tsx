import React, { useState } from 'react';
import { Card, Player, PublicPlayerView } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { PLAYER_COLORS } from './PlayerCard';

interface RepossessModalProps {
  attackerName: string;
  myPlayer: Player;
  otherPlayers: PublicPlayerView[]; // All other opponents + attacker
  hasJustSayNo: boolean;
  onJustSayNo: () => void;
  onConfirmRepossess: (keepCardId: string, distributions: { cardId: string; targetPlayerId: string }[]) => void;
}

export const RepossessModal: React.FC<RepossessModalProps> = ({
  attackerName,
  myPlayer,
  otherPlayers,
  hasJustSayNo,
  onJustSayNo,
  onConfirmRepossess,
}) => {
  // Flatten all properties
  const allProperties: Card[] = myPlayer.properties.flatMap((s) => s.cards);

  // 1 property chosen to KEEP
  const [keepCardId, setKeepCardId] = useState<string>(allProperties[0]?.id || '');

  // Distribution mapping: cardId -> targetPlayerId
  const [distributions, setDistributions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const defaultRecipient = otherPlayers[0]?.id || '';
    allProperties.forEach((c) => {
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
    if (!keepCardId) return;
    const distList = allProperties
      .filter((c) => c.id !== keepCardId)
      .map((c) => ({
        cardId: c.id,
        targetPlayerId: distributions[c.id] || otherPlayers[0]?.id || '',
      }));
    onConfirmRepossess(keepCardId, distList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl w-full bg-[#132319] border-2 border-rose-500 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f4d36] mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔨</span>
            <div>
              <h3 className="font-heading font-black text-base uppercase text-rose-400">
                Repossess! ({attackerName})
              </h3>
              <p className="text-[11px] text-slate-300">
                You must choose <strong>1 property to KEEP</strong> and distribute all other properties among players.
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
          👉 Click <strong>KEEP</strong> on the single property you want to hold onto. For all other properties, select which player receives each one.
        </div>

        {/* Property Cards List */}
        <div className="flex-1 overflow-y-auto max-h-72 p-2 bg-[#091710] rounded-2xl border border-[#1b3d2b] space-y-2 mb-4">
          {allProperties.map((card) => {
            const isKept = card.id === keepCardId;
            const recipientId = distributions[card.id] || otherPlayers[0]?.id;
            const meta = card.color ? PROPERTY_CONFIG[card.color] : null;

            return (
              <div
                key={card.id}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                  isKept
                    ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/40'
                    : 'bg-[#102b1e]/80 border-[#1f4d36]'
                }`}
              >
                {/* Property Info */}
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                    style={{ backgroundColor: meta?.hexColor || '#fbbf24' }}
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-100">{card.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {meta?.name || 'Wildcard'} • ${card.cashValue}M Value
                    </div>
                  </div>
                </div>

                {/* Actions: KEEP or SEND */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectKeep(card.id)}
                    className={`px-3 py-1.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow ${
                      isKept
                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                        : 'bg-[#0a1f15] hover:bg-[#143d2b] text-slate-300 border border-emerald-500/40'
                    }`}
                  >
                    {isKept ? '🛡️ KEEPING' : 'Keep'}
                  </button>

                  {!isKept && (
                    <div className="flex items-center gap-1.5 bg-[#081a12] p-1 rounded-xl border border-slate-700">
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Send to:</span>
                      {otherPlayers.map((player) => {
                        const isChosen = recipientId === player.id;
                        const colorTheme = PLAYER_COLORS[player.colorIndex % PLAYER_COLORS.length];
                        return (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => handleSetRecipient(card.id, player.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              isChosen
                                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow font-black'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${colorTheme.bg}`} />
                            {player.displayName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Confirmation */}
        <div className="pt-3 border-t border-[#1f4d36] flex justify-end gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3 rounded-2xl font-heading font-black text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/25 active:scale-95 border border-amber-300"
          >
            Confirm Repossession Distribution
          </button>
        </div>
      </div>
    </div>
  );
};
