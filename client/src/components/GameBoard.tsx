import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import {
  GameState,
  Card,
  Player,
  PublicPlayerView,
  Room,
  WinMode,
  PropertyColor,
  EVENT_PLAY_CARD,
  EVENT_END_TURN,
  EVENT_DRAW_CARDS,
} from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { CardView } from './CardView';
import { PLAYER_COLORS } from './PlayerCard';

interface GameBoardProps {
  room: Room;
  gameState: GameState;
  myHand: Card[];
  myPlayer: Player;
  players: PublicPlayerView[];
}

export const GameBoard: React.FC<GameBoardProps> = ({
  room,
  gameState,
  myHand,
  myPlayer,
  players,
}) => {
  const { socket } = useSocket();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  const isMyTurn = gameState.activePlayerId === myPlayer.id;
  const activePlayerPublic = players.find((p) => p.id === gameState.activePlayerId);
  const opponents = players.filter((p) => p.id !== myPlayer.id);

  // Play a card
  const handlePlayCard = (card: Card, targetColor?: PropertyColor) => {
    if (!isMyTurn) return;
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: card.id,
      targetColor,
    });
    setSelectedCard(null);
  };

  // Bank a card
  const handleBankCard = (card: Card) => {
    if (!isMyTurn) return;
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: card.id,
    });
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    socket?.emit(EVENT_END_TURN);
  };

  const handleDrawCards = () => {
    if (!isMyTurn) return;
    socket?.emit(EVENT_DRAW_CARDS);
  };

  // Calculate my current bank total
  const myBankTotal = myPlayer.bank.reduce((sum, c) => sum + (c.cashValue || 0), 0);

  // Calculate my owned chips held
  const myOwnedChipsCount = myPlayer.debtChips.filter(
    (c) => c.ownerId === myPlayer.id && c.currentHolderId === myPlayer.id
  ).length;

  return (
    <div className="min-h-screen tabletop-bg flex flex-col justify-between text-slate-100 overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP STATUS BAR                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 shadow-md">
        {/* Room & Mode Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
              Room:
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {room.code}
            </span>
          </div>

          <div className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300">
            {room.winMode === WinMode.EXTENDED_NO_MERCY
              ? 'Mode 2: Extended (4 Sets + $20M + 3 Chips)'
              : 'Mode 1: Standard (3 Sets + $10M + 3 Chips)'}
          </div>
        </div>

        {/* Turn Status Banner */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 ${
              isMyTurn
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            <span>{isMyTurn ? '👉 YOUR TURN' : `Turn: ${activePlayerPublic?.displayName}`}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20">
              Plays: {gameState.playsUsedThisTurn} / {gameState.maxPlaysPerTurn}
            </span>
          </div>

          {isMyTurn && (
            <button
              onClick={handleEndTurn}
              className="px-3.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow"
            >
              End Turn
            </button>
          )}

          {/* Action Log Drawer Toggle */}
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="p-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
          >
            📜 Log ({gameState.actionLog.length})
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN TABLE AREA                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-3 md:p-5 relative">
        {/* OPPONENTS' ROW (Top) */}
        <div className="w-full mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-2">
            <span>Opponents</span>
            <span className="text-slate-500">({opponents.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {opponents.map((opp) => {
              const oppColor = PLAYER_COLORS[opp.colorIndex % PLAYER_COLORS.length];
              const isOppTurn = opp.id === gameState.activePlayerId;

              return (
                <div
                  key={opp.id}
                  className={`bg-slate-900/80 rounded-xl p-3 border transition-all ${
                    isOppTurn
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Opponent Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 ${oppColor.bg}`}
                      >
                        {opp.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-slate-200 truncate">
                        {opp.displayName}
                      </span>
                    </div>

                    {isOppTurn && (
                      <span className="text-[10px] bg-amber-400/20 text-amber-400 border border-amber-400/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        Turn
                      </span>
                    )}
                  </div>

                  {/* Opponent Stats */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-2">
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Hand</div>
                      <div className="font-bold text-slate-200 mt-0.5">
                        🃏 {opp.handCount}
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Bank</div>
                      <div className="font-bold text-emerald-400 mt-0.5">
                        ${opp.bankTotal}M
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Chips</div>
                      <div className="font-bold text-blue-400 mt-0.5">
                        🪙 {opp.ownedChipsHeld}/3
                      </div>
                    </div>
                  </div>

                  {/* Opponent Properties */}
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                      <span>Sets ({opp.completeSetsCount} complete):</span>
                    </div>
                    {opp.properties.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic">No properties yet</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {opp.properties.map((set, sIdx) => {
                          const meta = PROPERTY_CONFIG[set.color];
                          return (
                            <span
                              key={sIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm"
                              style={{
                                backgroundColor: meta?.hexColor || '#334155',
                                color: meta?.textColor || '#fff',
                              }}
                            >
                              <span>{meta?.name || set.color}</span>
                              <span className="text-[9px] bg-black/30 px-1 rounded">
                                {set.cards.length}/{meta?.setSize || 3}
                              </span>
                              {set.isComplete && <span>✓</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER TABLE: PILES & DRAW DECK */}
        <div className="my-auto py-4 flex items-center justify-center gap-6">
          {/* Draw Pile */}
          <div
            onClick={isMyTurn ? handleDrawCards : undefined}
            className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
              isMyTurn
                ? 'border-amber-400 cursor-pointer hover:scale-105 shadow-xl shadow-amber-500/10'
                : 'border-slate-800'
            } bg-slate-900/90 w-32 h-44 justify-between`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-400">
              Draw Pile
            </div>
            <div className="text-3xl font-black text-amber-400">
              🂠
            </div>
            <div className="text-xs font-mono font-bold text-slate-300">
              {gameState.drawPileCount} cards left
            </div>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center p-3 rounded-2xl border-2 border-slate-800 bg-slate-900/90 w-32 h-44 justify-between">
            <div className="text-[10px] uppercase font-bold text-slate-400">
              Discard Pile
            </div>
            {gameState.discardPile.length > 0 ? (
              <div className="text-center">
                <div className="text-xs font-bold text-slate-200 line-clamp-2">
                  {gameState.discardPile[0].name}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                  ${gameState.discardPile[0].cashValue}M
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic my-auto">Empty</div>
            )}
            <div className="text-xs font-mono font-bold text-slate-400">
              {gameState.discardPile.length} discarded
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. ACTIVE PLAYER BOARD (Bottom)                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-2xl">
          {/* Player stats bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold text-slate-100">
                {myPlayer.displayName} (You)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                Player
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              {/* Bank Cash Total */}
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl">
                <span className="text-slate-400 uppercase text-[10px]">Bank:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${myBankTotal}M
                </span>
                <span className="text-slate-500 text-[10px]">({myPlayer.bank.length} cards)</span>
              </div>

              {/* Debt Chips Held */}
              <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/30 px-3 py-1 rounded-xl">
                <span className="text-slate-400 uppercase text-[10px]">Debt Chips:</span>
                <span className="font-bold text-blue-400 text-sm">
                  🪙 {myOwnedChipsCount}/3
                </span>
              </div>
            </div>
          </div>

          {/* Player's Laid Down Properties Area */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Your Property Area ({myPlayer.properties.length} sets active)
            </div>

            {myPlayer.properties.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 border border-dashed border-slate-800 rounded-xl text-center">
                You haven't laid down any properties yet. Play a property card from your hand!
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {myPlayer.properties.map((set, idx) => {
                  const meta = PROPERTY_CONFIG[set.color];
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 min-w-[140px] shadow-sm"
                    >
                      <div
                        className="text-xs font-bold px-2 py-1 rounded text-center mb-2 flex items-center justify-between"
                        style={{
                          backgroundColor: meta?.hexColor || '#334155',
                          color: meta?.textColor || '#fff',
                        }}
                      >
                        <span className="truncate">{meta?.name || set.color}</span>
                        <span>{set.cards.length}/{meta?.setSize || 3}</span>
                      </div>

                      <div className="space-y-1">
                        {set.cards.map((c) => (
                          <div
                            key={c.id}
                            className="text-[11px] text-slate-300 truncate bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800"
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>

                      {set.isComplete && (
                        <div className="mt-2 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-600/30 py-0.5 px-1 rounded text-center">
                          ✓ COMPLETE SET
                        </div>
                      )}

                      {set.house && (
                        <div className="mt-1 text-[10px] text-emerald-300 font-semibold bg-emerald-900/40 px-1 rounded text-center">
                          🏠 House (+ $3M)
                        </div>
                      )}
                      {set.hotel && (
                        <div className="mt-1 text-[10px] text-rose-300 font-semibold bg-rose-900/40 px-1 rounded text-center">
                          🏨 Hotel (+ $4M)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Player's Private Hand */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>🔒 Your Private Hand</span>
                <span className="text-slate-400 font-normal">
                  ({myHand.length} cards — Hidden from opponents)
                </span>
              </div>
              {isMyTurn && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  Click 'Play' or 'Bank' on any card to take action!
                </span>
              )}
            </div>

            {myHand.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
                Your hand is empty. Draw cards on your turn!
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 px-1">
                {myHand.map((card) => (
                  <div key={card.id} className="flex-shrink-0">
                    <CardView
                      card={card}
                      size="sm"
                      isPlayable={isMyTurn}
                      onPlay={() => handlePlayCard(card)}
                      onBank={() => handleBankCard(card)}
                      selected={selectedCard?.id === card.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. ACTION LOG DRAWER                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLogDrawer && (
        <aside className="fixed inset-y-0 right-0 w-80 bg-slate-950/95 border-l border-slate-800 z-50 p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-slate-100 flex items-center gap-2">
                <span>📜 Action Log</span>
              </h3>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
              {gameState.actionLog.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">{log.playerName}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="text-slate-200 leading-relaxed font-medium">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowLogDrawer(false)}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all mt-3"
          >
            Close Log
          </button>
        </aside>
      )}
    </div>
  );
};
