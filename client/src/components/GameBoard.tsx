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
  EVENT_LEAVE_ROOM,
  EVENT_SETTLE_DEBT,
  EVENT_RESOLVE_DEBT_DRAW,
  EVENT_RESPOND_JUST_SAY_NO,
  EVENT_SUBMIT_PAYMENT,
  EVENT_SUBMIT_REPOSSESS,
  EVENT_FLIP_WILDCARD,
} from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { CardView } from './CardView';
import { HandCardSlider } from './HandCardSlider';
import { ActionNotificationWindow } from './ActionNotificationWindow';
import { ActionTargetModal } from './ActionTargetModal';
import { ActionReactionModal } from './ActionReactionModal';
import { WildcardSelectModal } from './WildcardSelectModal';
import { RulesHelpModal } from './RulesHelpModal';
import { HandLimitDiscardModal } from './HandLimitDiscardModal';
import { RepossessModal } from './RepossessModal';
import { PLAYER_COLORS } from './PlayerCard';
import { getDebtChipTheme } from '../utils/debtChipThemes';
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
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Staged debt settlement from turn start draw (Points 4 & 5)
  const pendingSettlement = gameState.pendingDebtSettlement?.playerId === myPlayer.id
    ? gameState.pendingDebtSettlement
    : null;
  const [selectedPendingCardId, setSelectedPendingCardId] = useState<string | null>(null);

  const handleResolveDebtDraw = (cardId?: string) => {
    const idToUse = cardId || selectedPendingCardId || pendingSettlement?.drawnCards[0]?.id;
    if (!idToUse) return;
    sounds.playBankCoin();
    socket?.emit(EVENT_RESOLVE_DEBT_DRAW, { chosenCardId: idToUse });
    setSelectedPendingCardId(null);
  };

  const isMyTurn = gameState.activePlayerId === myPlayer.id;
  const activePlayerPublic = players.find((p) => p.id === gameState.activePlayerId);
  const opponents = players.filter((p) => p.id !== myPlayer.id);

  // Check if player has Just Say No in hand
  const hasJustSayNo = myHand.some(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
  );

  const [showHandLimitModal, setShowHandLimitModal] = useState(false);
  const [flipRainbowCard, setFlipRainbowCard] = useState<Card | null>(null);

  // Background Music state & toggle
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const toggleMusic = () => {
    const next = sounds.toggleBgm();
    setIsMusicPlaying(next);
  };

  // Sound cues on live game events
  const prevTurnPlayerRef = React.useRef(gameState.activePlayerId);
  const prevPendingActionIdRef = React.useRef(gameState.pendingAction?.id);

  React.useEffect(() => {
    // When turn changes to ME
    if (gameState.activePlayerId === myPlayer.id && prevTurnPlayerRef.current !== myPlayer.id) {
      sounds.playTurnNotification();
    }
    prevTurnPlayerRef.current = gameState.activePlayerId;
  }, [gameState.activePlayerId, myPlayer.id]);

  React.useEffect(() => {
    // When a new pending demand targets ME
    const currentPending = gameState.pendingAction;
    if (
      currentPending &&
      currentPending.id !== prevPendingActionIdRef.current &&
      currentPending.currentAwaitingPlayerId === myPlayer.id
    ) {
      if (currentPending.status === 'AWAITING_PAYMENT') {
        sounds.playRentDemanded();
      } else if (currentPending.status === 'AWAITING_JSN') {
        sounds.playActionAttack();
      }
    }
    prevPendingActionIdRef.current = currentPending?.id;
  }, [gameState.pendingAction?.id, gameState.pendingAction?.currentAwaitingPlayerId, myPlayer.id]);

  // Initiating card play
  const handleInitiatePlay = (card: Card) => {
    if (!isMyTurn || pendingSettlement || gameState.pendingAction) return;

    // 1. Dual-color wildcard modal (Screenshot 1)
    if (card.type === CardType.PROPERTY_WILDCARD && !card.isRainbow) {
      setWildcardModalCard(card);
      return;
    }

    // 2. Rainbow wildcard or targeted action modal
    const needsTargetModal =
      (card.type === CardType.PROPERTY_WILDCARD && card.isRainbow) ||
      (card.type === CardType.ACTION &&
        [
          ActionType.SLY_DEAL,
          ActionType.SUPER_SLY_DEAL,
          ActionType.FORCED_DEAL,
          ActionType.FORCED_DEBT,
          ActionType.DEBT_COLLECTOR,
          ActionType.YOINK,
          ActionType.REPOSSESS,
          ActionType.TOUGH_LUCK,
          ActionType.RENT,
          ActionType.SHACK,
          ActionType.HOUSE,
          ActionType.HOTEL,
        ].includes(card.actionType!));

    if (needsTargetModal) {
      setTargetingCard(card);
    } else {
      // Direct plays with situational sounds
      if (card.type === CardType.PROPERTY) {
        sounds.playPropertyPlacement();
      } else if (card.type === CardType.MONEY) {
        sounds.playBankCoin();
      } else {
        sounds.playCardSnap();
      }
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

  // Point 2: Hand limit discard choice
  const handleEndTurn = () => {
    if (!isMyTurn || pendingSettlement || gameState.pendingAction) return;
    if (myHand.length > 7) {
      setShowHandLimitModal(true);
      return;
    }
    sounds.playDrawCard();
    socket?.emit(EVENT_END_TURN);
  };

  const handleConfirmHandLimitDiscard = (discardCardIds: string[]) => {
    sounds.playDrawCard();
    socket?.emit(EVENT_END_TURN, { discardCardIds });
    setShowHandLimitModal(false);
  };

  // Point 5 & 9: Flipping wildcards costs 1 play
  const handleFlipWildcardInSet = (card: Card, currentColor: PropertyColor) => {
    if (!isMyTurn) return;
    if (gameState.playsUsedThisTurn >= gameState.maxPlaysPerTurn) {
      alert('No plays remaining this turn! (Max 3 plays per turn)');
      return;
    }

    if (card.isRainbow) {
      setFlipRainbowCard(card);
      return;
    }

    const otherColor = card.colors?.find((c) => c !== currentColor);
    if (otherColor) {
      sounds.playCardSnap();
      socket?.emit(EVENT_FLIP_WILDCARD, {
        cardId: card.id,
        toColor: otherColor,
      });
    }
  };

  const handleConfirmRainbowFlip = (toColor: PropertyColor) => {
    if (!flipRainbowCard) return;
    sounds.playCardSnap();
    socket?.emit(EVENT_FLIP_WILDCARD, {
      cardId: flipRainbowCard.id,
      toColor,
    });
    setFlipRainbowCard(null);
  };

  const handleLeaveGame = () => {
    socket?.emit(EVENT_LEAVE_ROOM);
    window.location.reload();
  };

  // Calculate my current bank total
  const myBankTotal = myPlayer.bank.reduce((sum, c) => sum + (c.cashValue || 0), 0);

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

          {/* Background Lounge Music Toggle */}
          <button
            onClick={toggleMusic}
            className={`p-1 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow transition-all ${
              isMusicPlaying
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                : 'bg-[#133324] border-[#1f4d36] hover:border-slate-500 text-slate-300'
            }`}
            title="Toggle Monopoly Lounge Background Music"
          >
            <span>{isMusicPlaying ? '🎵 Music: ON' : '🔈 Music: OFF'}</span>
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
                    {/* Chips Indicator with 6-color Palette (Point 10) */}
                    <div className="flex items-center gap-1">
                      {opp.debtChips && opp.debtChips.length > 0 ? (
                        opp.debtChips.map((chip) => {
                          const owner =
                            players.find((p) => p.id === chip.ownerId) ||
                            (chip.ownerId === myPlayer.id ? myPlayer : null);
                          const ownerColor = owner?.colorIndex ?? 0;
                          const theme = getDebtChipTheme(ownerColor);
                          const isOwn = chip.ownerId === opp.id;
                          return (
                            <span
                              key={chip.id}
                              title={
                                isOwn
                                  ? `${opp.displayName}'s Debt Chip (${theme.name})`
                                  : `${owner?.displayName || 'Player'}'s Debt Chip (Held by ${opp.displayName})`
                              }
                              className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold shadow ${theme.gradient} ${theme.border} ${theme.text}`}
                            >
                              🪙 {isOwn ? 'Own' : owner?.displayName?.slice(0, 5)}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">0 chips</span>
                      )}
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
                          const count = set.cards.length;
                          const baseRent =
                            meta?.rentValues?.[Math.min(count - 1, (meta?.rentValues?.length || 1) - 1)] || 1;
                          const totalRent =
                            baseRent + (set.shack ? 3 : 0) + (set.house ? 3 : 0) + (set.hotel ? 4 : 0);

                          return (
                            <div
                              key={sIdx}
                              className="bg-[#081a12] border border-black/40 rounded-lg p-1.5 min-w-[95px] shadow"
                            >
                              <div
                                className="text-[10px] font-heading font-bold px-1.5 py-0.5 rounded text-center mb-1 flex justify-between"
                                style={{
                                  backgroundColor: meta?.hexColor,
                                  color: meta?.textColor,
                                }}
                              >
                                <span className="truncate">{meta?.name}</span>
                                <span>
                                  {set.cards.length}/{meta?.setSize}
                                </span>
                              </div>

                              {/* Rent & Shack Display */}
                              <div className="text-[8px] text-emerald-400 font-mono font-bold text-center mb-1 bg-black/40 rounded py-0.2">
                                Rent: ${totalRent}M {set.shack ? '(Shack)' : ''}
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

        {/* CENTER TABLE: DRAW DECK & DISCARD PILE (Point 3: manual clicking disabled) */}
        <div className="my-auto py-2 flex items-center justify-center gap-8">
          {/* Draw Deck (Red Monopoly Card Back - Cards are drawn automatically) */}
          <div
            className="flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 border-slate-700/80 w-28 h-40 shadow-2xl select-none bg-gradient-to-b from-[#8b1e1e] to-[#5a1111] text-white"
            title="Cards are dealt automatically at the start of your turn (2 cards) or via action cards."
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

        {/* ── TRANSLUCENT CENTRAL ACTION WINDOW (Who asked what from whom) ── */}
        <ActionNotificationWindow
          gameState={gameState}
          players={players}
          myPlayer={myPlayer}
        />

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

            {/* Debt Chips Medallions with 6-color Palette (Point 10) */}
            <div className="flex items-center gap-2 bg-[#0c2217] border border-[#1f4d36] px-3 py-1.5 rounded-2xl shadow-inner">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Debt Chips:</span>
              <div className="flex items-center gap-1.5">
                {myPlayer.debtChips.map((chip) => {
                  const owner =
                    players.find((p) => p.id === chip.ownerId) ||
                    (chip.ownerId === myPlayer.id ? myPlayer : null);
                  const ownerColor = owner?.colorIndex ?? myPlayer.colorIndex;
                  const theme = getDebtChipTheme(ownerColor);
                  const isMyOwn = chip.ownerId === myPlayer.id;

                  return (
                    <div
                      key={chip.id}
                      title={
                        isMyOwn
                          ? `Your Debt Chip (${theme.name})`
                          : `${owner?.displayName || 'Opponent'}'s Debt Chip (Held by you)`
                      }
                      className={`px-2 py-0.5 rounded-full border flex items-center gap-1 font-heading font-bold text-[10px] shadow transition-all ${theme.gradient} ${theme.border} ${theme.text} ${theme.glow}`}
                    >
                      <span>🪙</span>
                      <span className="text-[9px] font-black uppercase">
                        {isMyOwn ? 'Yours' : owner?.displayName}
                      </span>
                    </div>
                  );
                })}
                {myPlayer.debtChips.length === 0 && (
                  <span className="text-[10px] text-slate-500 italic">None held</span>
                )}
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
                <div
                  className={`text-xs font-bold font-heading uppercase ${
                    isMyTurn ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
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
                    <div className="text-xs text-slate-500 italic mx-auto">empty</div>
                  ) : (
                    myPlayer.bank.map((card) => (
                      <div
                        key={card.id}
                        className="flex-shrink-0 scale-90 -mr-14 hover:mr-0 transition-all hover:scale-100 z-10 hover:z-30"
                      >
                        <CardView card={card} size="sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Property Sets on Table (Point 4: Shack rent & Point 5/9: Wildcard Flip buttons) */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  YOUR SETS • {myCompleteSetsCount} COMPLETE
                </div>

                {myPlayer.properties.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic p-2.5 bg-[#0b2318] border border-dashed border-[#1f4d36] rounded-2xl text-center">
                    no sets played yet
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {myPlayer.properties.map((set, idx) => {
                      const meta = PROPERTY_CONFIG[set.color];
                      const count = set.cards.length;
                      const baseRent =
                        meta?.rentValues?.[Math.min(count - 1, (meta?.rentValues?.length || 1) - 1)] || 1;
                      const shackBonus = set.shack ? 3 : 0;
                      const houseBonus = set.house ? 3 : 0;
                      const hotelBonus = set.hotel ? 4 : 0;
                      const totalRent = baseRent + shackBonus + houseBonus + hotelBonus;

                      return (
                        <div
                          key={idx}
                          className="bg-[#0b2318] border border-slate-700/80 rounded-xl p-2 min-w-[130px] shadow flex flex-col justify-between"
                        >
                          <div>
                            {/* Color Bar */}
                            <div
                              className="text-[10px] font-heading font-bold px-1.5 py-0.5 rounded text-center mb-1 flex items-center justify-between"
                              style={{
                                backgroundColor: meta?.hexColor,
                                color: meta?.textColor,
                              }}
                            >
                              <span className="truncate">{meta?.name}</span>
                              <span>
                                {set.cards.length}/{meta?.setSize}
                              </span>
                            </div>

                            {/* Point 4: Exact Rent Calculation Formula Display */}
                            <div className="text-[9px] text-emerald-300 font-mono font-bold bg-black/50 px-1 py-0.5 rounded mb-1 text-center border border-emerald-500/20">
                              Rent: ${baseRent}M {set.shack ? '+ $3M (Shack)' : ''} = ${totalRent}M
                            </div>

                            {/* Shack and Building Badges */}
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {set.shack && (
                                <span className="text-[8px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/50 px-1 py-0.2 rounded shadow-sm">
                                  🛖 Shack (+ $3M)
                                </span>
                              )}
                              {set.house && (
                                <span className="text-[8px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 px-1 py-0.2 rounded shadow-sm">
                                  🏠 House (+ $3M)
                                </span>
                              )}
                              {set.hotel && (
                                <span className="text-[8px] font-bold bg-rose-500/25 text-rose-300 border border-rose-400/50 px-1 py-0.2 rounded shadow-sm">
                                  🏨 Hotel (+ $4M)
                                </span>
                              )}
                            </div>

                            {/* Cards in this set */}
                            <div className="space-y-1">
                              {set.cards.map((c) => {
                                const isWild = c.type === CardType.PROPERTY_WILDCARD;
                                return (
                                  <div
                                    key={c.id}
                                    className="text-[9px] text-slate-200 bg-black/40 px-1.5 py-1 rounded flex items-center justify-between gap-1"
                                  >
                                    <span className="truncate">{c.name}</span>
                                    {/* Point 5 & 9: Flip Wildcard Button (Costs 1 Play) */}
                                    {isWild && isMyTurn && (
                                      <button
                                        type="button"
                                        onClick={() => handleFlipWildcardInSet(c, set.color)}
                                        className="px-1.5 py-0.5 bg-amber-500/30 hover:bg-amber-400 hover:text-slate-950 text-amber-200 border border-amber-400/60 rounded text-[8px] font-bold tracking-tight active:scale-95 transition-all shadow"
                                        title="Flip wildcard (Costs 1 Play)"
                                      >
                                        🔄 Flip (1 Play)
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {set.isComplete && (
                            <div className="mt-1.5 text-[8px] text-emerald-300 font-heading font-black bg-emerald-950/80 border border-emerald-500/40 py-0.5 rounded text-center uppercase tracking-wider">
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

            {/* Right Area: Interactive Hand Card Slider */}
            <div className="lg:col-span-7 flex flex-col items-center w-full min-w-0">
              <HandCardSlider
                cards={myHand}
                isMyTurn={isMyTurn}
                onPlayCard={handleInitiatePlay}
                onBankCard={handleBankCard}
              />
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
      {/* 6. REAL-TIME ACTION REACTION & REPOSSESS MODALS (Points 1, 6, 7)     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {gameState.pendingAction && gameState.pendingAction.currentAwaitingPlayerId === myPlayer.id && (
        <>
          {(gameState.pendingAction.status === 'AWAITING_JSN' ||
            gameState.pendingAction.status === 'AWAITING_PAYMENT') && (
            <ActionReactionModal
              attackerName={gameState.pendingAction.attackerName || 'Opponent'}
              cardName={gameState.pendingAction.card.name}
              demandDescription={gameState.pendingAction.demandDescription || ''}
              amountDue={gameState.pendingAction.amountDue || gameState.pendingAction.rentAmount || 0}
              status={gameState.pendingAction.status}
              myPlayer={myPlayer}
              hasJustSayNo={hasJustSayNo}
              onPayCards={(selectedCardIds, surrenderDebtChip) => {
                sounds.playBankCoin();
                socket?.emit(EVENT_SUBMIT_PAYMENT, {
                  actionId: gameState.pendingAction?.id,
                  selectedCardIds,
                  cardIds: selectedCardIds,
                  surrenderDebtChip,
                });
              }}
              onJustSayNo={() => {
                sounds.playJustSayNo();
                const jsnCard = myHand.find(
                  (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
                );
                socket?.emit(EVENT_RESPOND_JUST_SAY_NO, {
                  actionId: gameState.pendingAction?.id,
                  accept: false,
                  playJustSayNo: true,
                  justSayNoCardId: jsnCard?.id,
                });
              }}
              onAcceptAction={() => {
                sounds.playCardSnap();
                socket?.emit(EVENT_RESPOND_JUST_SAY_NO, {
                  actionId: gameState.pendingAction?.id,
                  accept: true,
                  playJustSayNo: false,
                });
              }}
            />
          )}

          {gameState.pendingAction.status === 'AWAITING_REPOSSESS' && (
            <RepossessModal
              attackerName={gameState.pendingAction.attackerName || 'Opponent'}
              myPlayer={myPlayer}
              otherPlayers={opponents}
              hasJustSayNo={hasJustSayNo}
              onJustSayNo={() => {
                sounds.playJustSayNo();
                const jsnCard = myHand.find(
                  (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
                );
                socket?.emit(EVENT_RESPOND_JUST_SAY_NO, {
                  actionId: gameState.pendingAction?.id,
                  accept: false,
                  playJustSayNo: true,
                  justSayNoCardId: jsnCard?.id,
                });
              }}
              onConfirmRepossess={(keepCardId, distributions) => {
                sounds.playActionAttack();
                socket?.emit(EVENT_SUBMIT_REPOSSESS, {
                  actionId: gameState.pendingAction?.id,
                  keepCardId,
                  distributions,
                });
              }}
            />
          )}
        </>
      )}

      {/* Floating Status Notification when another player is reacting */}
      {gameState.pendingAction && gameState.pendingAction.currentAwaitingPlayerId !== myPlayer.id && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-[#0a1f15]/95 border-2 border-amber-500/80 px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-amber-300">
            Waiting for {players.find((p) => p.id === gameState.pendingAction!.currentAwaitingPlayerId)?.displayName || 'Opponent'} to respond to {gameState.pendingAction.card.name}...
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6B. HAND LIMIT DISCARD MODAL (Point 2)                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showHandLimitModal && (
        <HandLimitDiscardModal
          excessCount={myHand.length - 7}
          hand={myHand}
          onConfirmDiscard={handleConfirmHandLimitDiscard}
          onCancel={() => setShowHandLimitModal(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6C. RAINBOW WILDCARD FLIP MODAL (Point 5 & 9)                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {flipRainbowCard && (
        <WildcardSelectModal
          card={flipRainbowCard}
          myPlayer={myPlayer}
          onSelectColor={handleConfirmRainbowFlip}
          onCancel={() => setFlipRainbowCard(null)}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 10. TURN START DEBT RECOVERY MODAL (Points 4 & 5)                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {pendingSettlement && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b2419] border-2 border-amber-400 rounded-3xl max-w-xl w-full p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f4d36]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪙</span>
                <div>
                  <h3 className="font-heading font-black text-base uppercase text-amber-400">
                    Debt Recovery (No Mercy Rule)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    You picked up 2 cards from the deck. Reclaim your Debt Chip before playing!
                  </p>
                </div>
              </div>
            </div>

            {/* Information */}
            <div className="bg-[#102b1e] p-3 rounded-2xl border border-[#1f4d36] text-xs leading-relaxed space-y-1">
              {pendingSettlement.creditorIds.length === 1 ? (
                <>
                  <p className="text-slate-200">
                    You owe 1 Debt Chip to{' '}
                    <strong className="text-amber-300">
                      {opponents.find((o) => o.id === pendingSettlement.creditorIds[0])?.displayName || 'Opponent'}
                    </strong>{' '}
                    (first priority).
                  </p>
                  <p className="text-amber-200/90 text-[11px]">
                    👉 Select <strong>1 of the 2 drawn cards</strong> to give them. You will get your Debt Chip back, the other card joins your hand, and this counts as <strong>1 play (2 shots left)</strong>!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-slate-200">
                    You owe 2 Debt Chips (to{' '}
                    <strong className="text-amber-300">
                      {pendingSettlement.creditorIds
                        .map((id) => opponents.find((o) => o.id === id)?.displayName)
                        .filter(Boolean)
                        .join(' and ')}
                    </strong>
                    ).
                  </p>
                  <p className="text-amber-200/90 text-[11px]">
                    👉 Both drawn cards will be surrendered to reclaim both of your Debt Chips. This will count as <strong>2 plays (1 shot left)</strong>!
                  </p>
                </>
              )}
            </div>

            {/* The 2 Drawn Cards Display */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Drawn Cards (Pick 1 to surrender):
              </div>
              <div className="flex justify-center items-center gap-4">
                {pendingSettlement.drawnCards.map((card) => {
                  const isSelected = (selectedPendingCardId || pendingSettlement.drawnCards[0]?.id) === card.id;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedPendingCardId(card.id)}
                      className={`cursor-pointer transition-all transform hover:scale-105 rounded-2xl p-1.5 ${
                        isSelected
                          ? 'ring-4 ring-amber-400 bg-amber-400/20 scale-105 shadow-xl shadow-amber-500/20'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      <CardView card={card} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleResolveDebtDraw()}
                className="w-full py-3 rounded-2xl font-heading font-black text-xs uppercase bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-lg shadow-amber-500/30 tracking-wider"
              >
                {pendingSettlement.creditorIds.length === 1
                  ? 'Surrender Selected Card & Reclaim Chip (1 Play Used)'
                  : 'Surrender Both Cards & Reclaim 2 Chips (2 Plays Used)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
