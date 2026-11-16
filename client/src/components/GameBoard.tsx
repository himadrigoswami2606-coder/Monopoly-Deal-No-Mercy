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
  EVENT_LEAVE_ROOM,
  EVENT_SETTLE_DEBT,
} from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { CardView } from './CardView';
import { ActionTargetModal } from './ActionTargetModal';
import { ActionReactionModal } from './ActionReactionModal';
import { WildcardSelectModal } from './WildcardSelectModal';
import { RulesHelpModal } from './RulesHelpModal';
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
  const [targetingCard, setTargetingCard] = useState<Card | null>(null);
  const [wildcardModalCard, setWildcardModalCard] = useState<Card | null>(null);
  const [reactionModalData, setReactionModalData] = useState<{
    attackerName: string;
    demandDescription: string;
    amountDue: number;
  } | null>(null);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const isMyTurn = gameState.activePlayerId === myPlayer.id;
  const activePlayerPublic = players.find((p) => p.id === gameState.activePlayerId);
  const opponents = players.filter((p) => p.id !== myPlayer.id);

  // Check if player has Just Say No in hand
  const hasJustSayNo = myHand.some(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
  );

  // Initiating card play
  const handleInitiatePlay = (card: Card) => {
    if (!isMyTurn) return;

    // 1. Wildcard modal (Screenshot 1)
    if (card.type === CardType.PROPERTY_WILDCARD && !card.isRainbow) {
      setWildcardModalCard(card);
      return;
    }

    // 2. Action targeting modal
    const needsTargetModal =
      card.type === CardType.ACTION &&
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
      ].includes(card.actionType!);

    if (needsTargetModal) {
      setTargetingCard(card);
    } else {
      // Direct plays (Properties, Pass Go, Money, etc.)
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

  // Confirming wildcard color from WildcardSelectModal (Screenshot 1)
  const handleConfirmWildcardColor = (chosenColor: PropertyColor) => {
    if (!wildcardModalCard) return;
    sounds.playCardSnap();
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: wildcardModalCard.id,
      targetColor: chosenColor,
    });
    setWildcardModalCard(null);
  };

  // Bank a card
  const handleBankCard = (card: Card) => {
    if (!isMyTurn) return;
    sounds.playBankCoin();
    socket?.emit(EVENT_PLAY_CARD, {
      cardId: card.id,
      asBank: true,
    });
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

  const handleLeaveGame = () => {
    socket?.emit(EVENT_LEAVE_ROOM);
    window.location.reload();
  };

  // Calculate my current bank total
  const myBankTotal = myPlayer.bank.reduce((sum, c) => sum + (c.cashValue || 0), 0);

  // Calculate my owned chips held
  const myOwnedChipsCount = myPlayer.debtChips.filter(
    (c) => c.ownerId === myPlayer.id && c.currentHolderId === myPlayer.id
  ).length;

  // Complete property sets count
  const myCompleteSetsCount = myPlayer.properties.filter((s) => s.isComplete).length;

  // Creditor who holds one of my debt chips (if any)
  const chipCreditor = opponents.find((opp) =>
    opp.debtChips?.some((c) => c.ownerId === myPlayer.id)
  );

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedSettleCardId, setSelectedSettleCardId] = useState<string | null>(null);

  const handleConfirmSettle = () => {
    if (!chipCreditor || !selectedSettleCardId) return;
    sounds.playBankCoin();
    socket?.emit(EVENT_SETTLE_DEBT, {
      cardId: selectedSettleCardId,
      creditorId: chipCreditor.id,
    });
    setShowSettleModal(false);
    setSelectedSettleCardId(null);
  };

  return (
    <div className="min-h-screen felt-tabletop flex flex-col justify-between text-slate-100 overflow-x-hidden font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP STATUS BAR (IDENTICAL TO REFERENCE SCREENSHOT)               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="bg-[#081a12]/90 border-b border-[#1b3d2b] px-4 py-2.5 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-lg tracking-wider text-slate-100">
              Monopoly Deal
            </span>
            <span className="text-[10px] uppercase font-mono font-bold text-amber-400 bg-black/40 px-2 py-0.5 rounded border border-amber-500/30">
              NO MERCY • #{room.code}
            </span>
          </div>

          <div className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-[#133324] border border-[#1f4d36] text-[10px] font-bold text-amber-300">
            {room.winMode === WinMode.EXTENDED_NO_MERCY
              ? 'Mode 2: 4 Sets + $20M + 3 Chips'
              : 'Mode 1: 3 Sets + $10M + 3 Chips'}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Rules & Help Button */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1 px-2.5 rounded-lg bg-[#133324] border border-amber-500/40 hover:border-amber-400 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow transition-all hover:bg-[#1a402e]"
            title="Monopoly Deal No Mercy Rules & Card Guide"
          >
            <span className="text-sm">❓</span>
            <span className="hidden sm:inline">Rules & Cards</span>
          </button>

          {/* Action Log Drawer Toggle */}
          <button
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="p-1 px-2.5 rounded-lg bg-[#133324] border border-[#1f4d36] hover:border-slate-500 text-slate-300 text-xs font-semibold flex items-center gap-1 shadow"
          >
            <span>📜</span>
            <span className="hidden sm:inline">Log</span>
            <span className="bg-black/30 text-amber-400 px-1 rounded text-[10px] font-bold">
              {gameState.actionLog.length}
            </span>
          </button>

          {/* Resign / Leave Button */}
          <button
            onClick={handleLeaveGame}
            className="px-3 py-1 rounded-lg bg-[#5c1d1d] hover:bg-[#782525] text-white font-heading text-xs font-bold uppercase tracking-wider transition-all shadow border border-red-500/40"
          >
            Resign
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN TABLE FELT AREA                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-3 md:p-6 relative">
        {/* OPPONENTS' PEDESTALS (TOP CENTER) */}
        <div className="w-full max-w-5xl mx-auto mb-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {opponents.map((opp) => {
              const oppColor = PLAYER_COLORS[opp.colorIndex % PLAYER_COLORS.length];
              const isOppTurn = opp.id === gameState.activePlayerId;

              return (
                <div key={opp.id} className="flex flex-col items-center">
                  {/* Opponent Pill (Screenshot 3) */}
                  <div
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all ${
                      isOppTurn
                        ? 'bg-[#184a32] border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20'
                        : 'bg-[#102b1e]/90 border-[#1f4d36]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 ${oppColor.bg}`}
                    >
                      {opp.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-100">{opp.displayName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {opp.completeSetsCount}/3 • ${opp.bankTotal}M • {opp.handCount}c
                      </span>
                    </div>
                    {/* Chips Indicator */}
                    <div className="text-[10px] text-amber-300 font-mono font-bold">
                      🪙 {opp.ownedChipsHeld}/3
                    </div>
                  </div>

                  {/* Opponent's Laid Down Table Row (Screenshot 3) */}
                  <div className="w-full mt-2 bg-[#0d261b]/80 border border-[#1b3d2b] rounded-2xl p-2.5 shadow-inner">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex justify-between px-1">
                      <span>{opp.displayName.toUpperCase()}'S TABLE</span>
                      <span className="text-slate-500">
                        {opp.completeSetsCount} complete • {opp.properties.length} sets
                      </span>
                    </div>

                    {opp.properties.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic py-1 text-center">
                        no sets played
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {opp.properties.map((set, sIdx) => {
                          const meta = PROPERTY_CONFIG[set.color];
                          return (
                            <div
                              key={sIdx}
                              className="bg-[#081a12] border border-black/40 rounded-lg p-1.5 min-w-[90px] shadow"
                            >
                              <div
                                className="text-[10px] font-heading font-bold px-1.5 py-0.5 rounded text-center mb-1 flex justify-between"
                                style={{
                                  backgroundColor: meta?.hexColor,
                                  color: meta?.textColor,
                                }}
                              >
                                <span className="truncate">{meta?.name}</span>
                                <span>{set.cards.length}/{meta?.setSize}</span>
                              </div>
                              <div className="space-y-0.5">
                                {set.cards.map((c) => (
                                  <div
                                    key={c.id}
                                    className="text-[9px] text-slate-300 truncate bg-slate-950/60 px-1 py-0.2 rounded"
                                  >
                                    {c.name}
                                  </div>
                                ))}
                              </div>
                            </div>
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

        {/* CENTER TABLE: DRAW DECK & DISCARD PILE (Screenshot 3) */}
        <div className="my-auto py-2 flex items-center justify-center gap-8">
          {/* Draw Deck (Red Monopoly Card Back like in Screenshot 3) */}
          <div
            onClick={isMyTurn ? handleDrawCards : undefined}
            className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 transition-all w-28 h-40 shadow-2xl select-none ${
              isMyTurn
                ? 'border-amber-400 cursor-pointer hover:scale-105 ring-2 ring-amber-400/40 shadow-amber-500/20'
                : 'border-slate-800 opacity-90'
            } bg-gradient-to-b from-[#8b1e1e] to-[#5a1111] text-white`}
          >
            <div className="text-[9px] uppercase font-heading font-black tracking-widest text-amber-200">
              MONOPOLY
            </div>
            <div className="my-auto text-center">
              <div className="font-heading font-black text-2xl tracking-tighter drop-shadow">
                DEAL
              </div>
              <div className="text-[8px] font-sans font-bold uppercase tracking-widest text-amber-300">
                NO MERCY
              </div>
            </div>
            <div className="text-[10px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded border border-white/20">
              {gameState.drawPileCount} left
            </div>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 border-[#1f4d36] bg-[#0c2217] w-28 h-40 shadow-2xl">
            <div className="text-[9px] uppercase font-heading font-bold tracking-wider text-slate-400">
              Discard
            </div>
            {gameState.discardPile.length > 0 ? (
              <div className="my-auto text-center px-1">
                <div className="text-[11px] font-heading font-bold text-slate-100 uppercase line-clamp-2">
                  {gameState.discardPile[0].name}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                  ${gameState.discardPile[0].cashValue}M
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic my-auto">Empty</div>
            )}
            <div className="text-[10px] font-mono text-slate-400 bg-black/30 px-1.5 py-0.5 rounded">
              {gameState.discardPile.length} cards
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. ACTIVE PLAYER BOARD CONSOLE (Screenshot 3)                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="w-full max-w-6xl mx-auto bg-[#102b1e]/95 border border-[#1f4d36] rounded-3xl p-4 md:p-5 shadow-2xl backdrop-blur-md">
          {/* Console Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1b3d2b] mb-3">
            {/* Player Pill (Screenshot 3) */}
            <div className="flex items-center gap-2.5 bg-[#184a32] px-3.5 py-1.5 rounded-full border border-[#2d6a4f] shadow-sm">
              <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow">
                {myPlayer.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-100">{myPlayer.displayName} (you)</span>
                <span className="text-emerald-300 font-mono font-bold">
                  ${myBankTotal}M • {myCompleteSetsCount}/3 sets • {myHand.length}c
                </span>
              </div>
            </div>

            {/* Debt Chips Medallions (No Mercy) */}
            <div className="flex items-center gap-2 bg-[#0c2217] border border-[#1f4d36] px-3 py-1.5 rounded-2xl shadow-inner">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Debt Chips:</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((num) => {
                  const isHeld = num <= myOwnedChipsCount;
                  return (
                    <div
                      key={num}
                      title={isHeld ? `Debt Chip ${num} (Held)` : `Debt Chip ${num} (Lost!)`}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center font-heading font-black text-[10px] shadow transition-all ${
                        isHeld
                          ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-amber-200 text-slate-950 shadow-amber-500/40 ring-1 ring-amber-400'
                          : 'bg-black/50 border-dashed border-slate-700 text-slate-600 opacity-40'
                      }`}
                    >
                      {isHeld ? '🪙' : '✕'}
                    </div>
                  );
                })}
              </div>

              {/* Settle Debt Button if chip is owed to an opponent */}
              {isMyTurn && chipCreditor && myHand.length > 0 && (
                <button
                  onClick={() => setShowSettleModal(true)}
                  className="ml-2 flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 rounded-xl text-[10px] font-bold animate-pulse transition-all shadow"
                  title={`Give 1 card to ${chipCreditor.displayName} to reclaim your chip`}
                >
                  <span>Reclaim Chip</span>
                </button>
              )}
            </div>

            {/* Turn & Play Counter with Large Golden END TURN Button (Screenshot 3) */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-xs font-bold font-heading uppercase ${isMyTurn ? 'text-amber-400' : 'text-slate-400'}`}>
                  {isMyTurn ? 'Your Turn' : `${activePlayerPublic?.displayName}'s Turn`}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {gameState.playsUsedThisTurn}/3 cards played
                </div>
              </div>

              {isMyTurn && (
                <button
                  onClick={handleEndTurn}
                  className="py-2.5 px-6 rounded-xl font-heading font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25 active:scale-95 uppercase tracking-wider text-sm border border-amber-300"
                >
                  End Turn
                </button>
              )}
            </div>
          </div>

          {/* Lower Grid: Bank & Sets on Table (Left) + Fanned Hand (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Left Area (Bank & Sets) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Bank Area (Screenshot 3) */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                  <span>BANK (${myBankTotal}M)</span>
                  <span className="text-[9px] text-slate-500">Stacked cash cards</span>
                </div>

                <div className="h-28 bg-[#0b2318] border border-dashed border-[#1f4d36] rounded-2xl p-2 flex items-center gap-2 overflow-x-auto shadow-inner">
                  {myPlayer.bank.length === 0 ? (
                    <div className="text-xs text-slate-500 italic mx-auto">
                      empty
                    </div>
                  ) : (
                    myPlayer.bank.map((card) => (
                      <div key={card.id} className="flex-shrink-0 scale-90 -mr-14 hover:mr-0 transition-all hover:scale-100 z-10 hover:z-30">
                        <CardView card={card} size="sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Property Sets on Table */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  YOUR SETS • {myCompleteSetsCount} COMPLETE
                </div>

                {myPlayer.properties.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic p-2.5 bg-[#0b2318] border border-dashed border-[#1f4d36] rounded-2xl text-center">
                    no sets played yet
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {myPlayer.properties.map((set, idx) => {
                      const meta = PROPERTY_CONFIG[set.color];
                      return (
                        <div
                          key={idx}
                          className="bg-[#0b2318] border border-slate-700/80 rounded-xl p-2 min-w-[110px] shadow"
                        >
                          <div
                            className="text-[10px] font-heading font-bold px-1.5 py-0.5 rounded text-center mb-1 flex items-center justify-between"
                            style={{
                              backgroundColor: meta?.hexColor,
                              color: meta?.textColor,
                            }}
                          >
                            <span className="truncate">{meta?.name}</span>
                            <span>{set.cards.length}/{meta?.setSize}</span>
                          </div>

                          <div className="space-y-0.5">
                            {set.cards.map((c) => (
                              <div
                                key={c.id}
                                className="text-[9px] text-slate-200 truncate bg-black/40 px-1 py-0.2 rounded"
                              >
                                {c.name}
                              </div>
                            ))}
                          </div>

                          {set.isComplete && (
                            <div className="mt-1 text-[8px] text-emerald-300 font-heading font-black bg-emerald-950/80 border border-emerald-500/40 py-0.2 rounded text-center uppercase tracking-wider">
                              ✓ COMPLETE
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Area: Authentic Fanned Hand (Screenshot 3) */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-end">
              <div className="w-full flex items-center justify-center lg:justify-end overflow-x-auto pt-6 pb-2 px-6">
                <div className="flex items-center">
                  {myHand.map((card) => (
                    <div
                      key={card.id}
                      className="card-fan-item flex-shrink-0"
                    >
                      <CardView
                        card={card}
                        size="md"
                        isPlayable={isMyTurn}
                        onPlay={() => handleInitiatePlay(card)}
                        onBank={() => handleBankCard(card)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtitle Caption under Hand (Screenshot 3) */}
              <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 mt-1 uppercase">
                HOVER TO PEEK • CLICK TO PLAY
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. WILDCARD COLOR SELECTION MODAL (Screenshot 1)                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {wildcardModalCard && (
        <WildcardSelectModal
          card={wildcardModalCard}
          myPlayer={myPlayer}
          onSelectColor={handleConfirmWildcardColor}
          onCancel={() => setWildcardModalCard(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. ACTION TARGETING MODAL                                           */}
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
      {/* 6. PAYMENT / JUST SAY NO REACTION MODAL (Screenshot 2)              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {reactionModalData && (
        <ActionReactionModal
          attackerName={reactionModalData.attackerName}
          demandDescription={reactionModalData.demandDescription}
          amountDue={reactionModalData.amountDue}
          myPlayer={myPlayer}
          hasJustSayNo={hasJustSayNo}
          onPayCards={() => setReactionModalData(null)}
          onJustSayNo={() => {
            sounds.playJustSayNo();
            setReactionModalData(null);
          }}
          onSurrenderDebtChip={() => setReactionModalData(null)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. LIVE ACTION LOG DRAWER                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showLogDrawer && (
        <aside className="fixed inset-y-0 right-0 w-80 bg-[#081a12]/95 border-l border-[#1f4d36] z-50 p-4 shadow-2xl flex flex-col justify-between backdrop-blur-md animate-fade-in">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3d2b] mb-3">
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
                  className="bg-[#102b1e]/90 p-2.5 rounded-xl border border-[#1f4d36]/80 text-xs shadow-sm"
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
            className="w-full py-2 rounded-xl bg-[#133324] hover:bg-[#1a402e] text-slate-200 text-xs font-semibold transition-all mt-3 border border-[#1f4d36]"
          >
            Close Log
          </button>
        </aside>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. RULES & CARDS HELP MODAL                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showRulesModal && (
        <RulesHelpModal onClose={() => setShowRulesModal(false)} />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9. SETTLE DEBT MODAL (Official No Mercy Rule)                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showSettleModal && chipCreditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0e2a1e] border-2 border-amber-500/60 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f4d36]">
              <h3 className="font-heading font-black text-base uppercase text-amber-400 flex items-center gap-2">
                <span>🪙 Settle Debt with {chipCreditor.displayName}</span>
              </h3>
              <button
                onClick={() => setShowSettleModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              According to Monopoly Deal: No Mercy rules, at the start of your turn you can settle your debt. Choose <strong>1 card from your hand</strong> to give to <strong>{chipCreditor.displayName}</strong>. They will play it immediately and return your Debt Chip!
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {myHand.map((card) => {
                const isSelected = selectedSettleCardId === card.id;
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedSettleCardId(card.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow'
                        : 'bg-[#081a12] border-[#1b3d2b] text-slate-300 hover:bg-[#133324]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{card.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        ({card.type})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${card.cashValue}M
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#1f4d36] flex justify-end gap-3">
              <button
                onClick={() => setShowSettleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={!selectedSettleCardId}
                onClick={handleConfirmSettle}
                className="px-5 py-2 rounded-xl font-heading font-bold text-xs uppercase bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all"
              >
                Surrender Card & Reclaim Chip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
