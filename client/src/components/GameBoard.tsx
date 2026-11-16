import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import {
  GameState,
  Card,
  CardType,
  ActionType,
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
import { ActionTargetModal } from './ActionTargetModal';
import { PLAYER_COLORS } from './PlayerCard';
import { sounds } from '../utils/audio';

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
  const [targetingCard, setTargetingCard] = useState<Card | null>(null);
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  const isMyTurn = gameState.activePlayerId === myPlayer.id;
  const activePlayerPublic = players.find((p) => p.id === gameState.activePlayerId);
  const opponents = players.filter((p) => p.id !== myPlayer.id);

  // Initiating card play
  const handleInitiatePlay = (card: Card) => {
    if (!isMyTurn) return;

    // Actions or Wildcards that require player choices / targeting
    const needsTargetModal =
      card.type === CardType.PROPERTY_WILDCARD ||
      (card.type === CardType.ACTION &&
        [
          ActionType.SLY_DEAL,
          ActionType.SUPER_SLY_DEAL,
          ActionType.FORCED_DEAL,
          ActionType.DEBT_COLLECTOR,
          ActionType.YOINK,
          ActionType.REPOSSESS,
          ActionType.TOUGH_LUCK,
          ActionType.RENT,
          ActionType.HOUSE,
          ActionType.HOTEL,
        ].includes(card.actionType!));

    if (needsTargetModal) {
      setTargetingCard(card);
    } else {
      // Direct plays (Properties, Pass Go, etc.)
      sounds.playCardSnap();
      socket?.emit(EVENT_PLAY_CARD, { cardId: card.id });
    }
  };

  // Confirming target options from modal
  const handleConfirmTargeting = (options: {
    targetPlayerId?: string;
    targetColor?: PropertyColor;
    targetCardId?: string;
    myCardId?: string;
    chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
  }) => {
    if (!targetingCard) return;
    sounds.playActionAttack();
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: targetingCard.id,
      ...options,
    });
    setTargetingCard(null);
  };

  // Bank a card
  const handleBankCard = (card: Card) => {
    if (!isMyTurn) return;
    sounds.playBankCoin();
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: card.id,
      asBank: true,
    });
    setSelectedCard(null);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    sounds.playDrawCard();
    socket?.emit(EVENT_END_TURN);
  };

  const handleDrawCards = () => {
    if (!isMyTurn) return;
    sounds.playDrawCard();
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
      <header className="bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 shadow-lg">
        {/* Room & Mode Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
              Room:
            </span>
            <span className="font-mono font-black text-amber-400 text-sm tracking-wider">
              {room.code}
            </span>
          </div>

          <div className="hidden sm:inline-block px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300">
            {room.winMode === WinMode.EXTENDED_NO_MERCY
              ? 'Mode 2: Extended (4 Sets + $20M + 3 Chips)'
              : 'Mode 1: Standard (3 Sets + $10M + 3 Chips)'}
          </div>
        </div>

        {/* Turn Status Banner */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              isMyTurn
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50'
                : 'bg-slate-900 text-slate-300 border border-slate-800'
            }`}
          >
            <span className="font-heading tracking-wide">
              {isMyTurn ? '👉 YOUR TURN' : `Turn: ${activePlayerPublic?.displayName}`}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono">
              Plays: {gameState.playsUsedThisTurn} / {gameState.maxPlaysPerTurn}
            </span>
          </div>

          {isMyTurn && (
            <button
              onClick={handleEndTurn}
              className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              End Turn
            </button>
          )}

          {/* Action Log Drawer Toggle */}
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="p-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 shadow"
          >
            <span>📜</span>
            <span className="hidden sm:inline">Log</span>
            <span className="bg-slate-800 text-amber-400 px-1 rounded text-[10px] font-bold">
              {gameState.actionLog.length}
            </span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN TABLE AREA                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-3 md:p-5 relative">
        {/* OPPONENTS' ROW (Top) */}
        <div className="w-full mb-3">
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
                  className={`bg-slate-900/90 rounded-2xl p-3 border transition-all ${
                    isOppTurn
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-xl shadow-amber-500/10'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Opponent Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 shadow ${oppColor.bg}`}
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
                    <div className="bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">Hand</div>
                      <div className="font-bold text-slate-200 mt-0.5">
                        🃏 {opp.handCount}
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">Bank</div>
                      <div className="font-bold text-emerald-400 mt-0.5 font-mono">
                        ${opp.bankTotal}M
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">Chips</div>
                      <div className="font-bold text-blue-400 mt-0.5 font-mono">
                        🪙 {opp.ownedChipsHeld}/3
                      </div>
                    </div>
                  </div>

                  {/* Opponent Properties */}
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex justify-between font-semibold">
                      <span>Sets ({opp.completeSetsCount} complete):</span>
                    </div>
                    {opp.properties.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic">No properties laid down</div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {opp.properties.map((set, sIdx) => {
                          const meta = PROPERTY_CONFIG[set.color];
                          return (
                            <span
                              key={sIdx}
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow-sm border border-black/30"
                              style={{
                                backgroundColor: meta?.hexColor || '#334155',
                                color: meta?.textColor || '#fff',
                              }}
                            >
                              <span>{meta?.name || set.color}</span>
                              <span className="text-[9px] bg-black/40 px-1 rounded">
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
        <div className="my-auto py-3 flex items-center justify-center gap-6">
          {/* Draw Pile */}
          <div
            onClick={isMyTurn ? handleDrawCards : undefined}
            className={`flex flex-col items-center justify-between p-3 rounded-2xl border-2 transition-all bg-gradient-to-b from-slate-800 to-slate-950 w-32 h-44 shadow-2xl ${
              isMyTurn
                ? 'border-amber-400 cursor-pointer hover:scale-105 shadow-amber-500/20 ring-2 ring-amber-400/30'
                : 'border-slate-800 opacity-90'
            }`}
          >
            <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-amber-400">
              Draw Deck
            </div>
            <div className="text-4xl font-black text-amber-400 select-none drop-shadow">
              🂠
            </div>
            <div className="text-xs font-mono font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              {gameState.drawPileCount} left
            </div>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center justify-between p-3 rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 w-32 h-44 shadow-2xl">
            <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-slate-400">
              Discard
            </div>
            {gameState.discardPile.length > 0 ? (
              <div className="text-center px-1">
                <div className="text-xs font-heading font-bold text-slate-100 uppercase line-clamp-2">
                  {gameState.discardPile[0].name}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 font-mono font-bold">
                  ${gameState.discardPile[0].cashValue}M
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic my-auto">Empty</div>
            )}
            <div className="text-xs font-mono font-bold text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              {gameState.discardPile.length} cards
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. ACTIVE PLAYER BOARD (Bottom)                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="w-full bg-slate-950/95 border border-slate-800 rounded-3xl p-4 shadow-2xl backdrop-blur-md">
          {/* Header Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-extrabold text-slate-100 tracking-wide">
                {myPlayer.displayName} (You)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 uppercase">
                Active Player
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              {/* Bank Balance */}
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-inner">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Bank:</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  ${myBankTotal}M
                </span>
                <span className="text-slate-400 text-[10px]">({myPlayer.bank.length} cards)</span>
              </div>

              {/* 3D Debt Chips */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl shadow-inner">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Chips:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((num) => {
                    const isHeld = num <= myOwnedChipsCount;
                    return (
                      <div
                        key={num}
                        title={isHeld ? `Debt Chip ${num} (Held)` : `Debt Chip ${num} (Lost!)`}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center font-heading font-black text-[10px] shadow transition-all ${
                          isHeld
                            ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-amber-200 text-slate-950 shadow-amber-500/40 ring-1 ring-amber-400'
                            : 'bg-slate-950 border-dashed border-slate-700 text-slate-600 opacity-40'
                        }`}
                      >
                        {isHeld ? '🪙' : '✕'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Property Sets on Table */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <span>Your Properties on Table</span>
              <span className="text-slate-500 font-normal">
                ({myPlayer.properties.length} sets active)
              </span>
            </div>

            {myPlayer.properties.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 border border-dashed border-slate-800 rounded-2xl text-center bg-slate-950/40">
                You haven't laid down any properties yet. Play a property card from your hand!
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {myPlayer.properties.map((set, idx) => {
                  const meta = PROPERTY_CONFIG[set.color];
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-2 min-w-[130px] shadow-md"
                    >
                      <div
                        className="text-[11px] font-heading font-bold px-2 py-1 rounded-lg text-center mb-1.5 flex items-center justify-between border border-black/40"
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
                            className="text-[10px] text-slate-200 truncate bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 font-medium"
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>

                      {set.isComplete && (
                        <div className="mt-1.5 text-[9px] text-emerald-300 font-heading font-black bg-emerald-950/80 border border-emerald-500/40 py-0.5 px-1 rounded text-center tracking-wider uppercase">
                          ✓ COMPLETE SET
                        </div>
                      )}

                      {set.house && (
                        <div className="mt-1 text-[9px] text-emerald-200 font-semibold bg-emerald-900/60 px-1 rounded text-center">
                          🏠 House (+ $3M)
                        </div>
                      )}
                      {set.hotel && (
                        <div className="mt-1 text-[9px] text-rose-200 font-semibold bg-rose-900/60 px-1 rounded text-center">
                          🏨 Hotel (+ $4M)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Private Hand with Official Cards */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>🔒 Your Private Hand</span>
                <span className="text-slate-400 font-normal">
                  ({myHand.length} cards — Hidden from opponents)
                </span>
              </div>
              {isMyTurn && (
                <span className="text-[11px] text-emerald-400 font-semibold">
                  Choose a card to play or bank!
                </span>
              )}
            </div>

            {myHand.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                Your hand is empty. Draw cards on your turn!
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1">
                {myHand.map((card) => (
                  <div key={card.id} className="flex-shrink-0">
                    <CardView
                      card={card}
                      size="sm"
                      isPlayable={isMyTurn}
                      onPlay={() => handleInitiatePlay(card)}
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
      {/* 4. ACTION TARGETING MODAL                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {targetingCard && (
        <ActionTargetModal
          card={targetingCard}
          myPlayer={myPlayer}
          opponents={opponents}
          onConfirm={handleConfirmTargeting}
          onCancel={() => setTargetingCard(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. ACTION LOG DRAWER                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLogDrawer && (
        <aside className="fixed inset-y-0 right-0 w-80 bg-slate-950/95 border-l border-slate-800 z-50 p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md animate-fade-in">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wide text-slate-100 flex items-center gap-2">
                <span>📜 Live Action Log</span>
              </h3>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
              {gameState.actionLog.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-amber-400">{log.playerName}</span>
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
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
