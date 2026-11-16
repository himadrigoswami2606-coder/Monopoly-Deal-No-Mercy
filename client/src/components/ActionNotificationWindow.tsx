import React, { useEffect, useState } from 'react';
import { GameState, PublicPlayerView, Player, ActionLogEntry } from '../../../shared/types';

interface ActionNotificationWindowProps {
  gameState: GameState;
  players: PublicPlayerView[];
  myPlayer: Player;
}

export const ActionNotificationWindow: React.FC<ActionNotificationWindowProps> = ({
  gameState,
  players,
  myPlayer,
}) => {
  const pending = gameState.pendingAction;
  const activePlayer = players.find((p) => p.id === gameState.activePlayerId);

  // Authoritative latest log: index 0 is ALWAYS the newest event (due to unshift)
  const latestLog: ActionLogEntry | null =
    gameState.actionLog && gameState.actionLog.length > 0
      ? gameState.actionLog[0]
      : null;

  const [visibleRecentLog, setVisibleRecentLog] = useState<ActionLogEntry | null>(null);

  // When a new log arrives, display it live with a snappy 3.8s duration
  useEffect(() => {
    if (latestLog) {
      setVisibleRecentLog(latestLog);
      const timer = setTimeout(() => {
        setVisibleRecentLog(null);
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [latestLog?.id]);

  // When active player changes (new turn starts), clear stale action logs from previous players immediately
  useEffect(() => {
    if (visibleRecentLog && visibleRecentLog.playerId !== gameState.activePlayerId && !pending) {
      if (latestLog && latestLog.playerId === gameState.activePlayerId) {
        setVisibleRecentLog(latestLog);
      } else {
        setVisibleRecentLog(null);
      }
    }
  }, [gameState.activePlayerId]);

  // Determine announcement content
  let icon = '📢';
  let badgeText = 'Action Update';
  let title = '';
  let subtitle = '';
  let borderColor = 'border-amber-400/50';
  let badgeBg = 'bg-amber-400/20 text-amber-300 border-amber-400/30';
  let containerBg = 'bg-[#081a12]/92';

  if (pending) {
    const attacker = players.find((p) => p.id === pending.attackerId) || { displayName: pending.attackerName };
    const target = players.find((p) => p.id === pending.currentAwaitingPlayerId);
    const amount = pending.amountDue || pending.rentAmount || 0;
    const isAttackerMe = pending.attackerId === myPlayer.id;
    const isTargetMe = pending.currentAwaitingPlayerId === myPlayer.id;

    const attackerDisplay = isAttackerMe ? 'You' : attacker.displayName;
    const targetDisplay = isTargetMe ? 'You' : (target?.displayName || 'all opponents');

    if (pending.status === 'AWAITING_PAYMENT') {
      icon = '💰';
      badgeText = 'Rent / Demand';
      borderColor = 'border-amber-400 ring-2 ring-amber-400/30';
      badgeBg = 'bg-amber-500/25 text-amber-300 border-amber-400/50';
      title = `${attackerDisplay} asked $${amount}M from ${targetDisplay}!`;
      subtitle = isTargetMe
        ? '👉 Choose Bank cash or Properties to pay, or surrender a Debt Chip if insolvent!'
        : `Waiting for ${targetDisplay} to select payment cards...`;
    } else if (pending.status === 'AWAITING_REPOSSESS') {
      icon = '🔨';
      badgeText = 'Repossess';
      borderColor = 'border-rose-400 ring-2 ring-rose-400/30';
      badgeBg = 'bg-rose-500/25 text-rose-300 border-rose-400/50';
      title = `${attackerDisplay} played Repossess on ${targetDisplay}!`;
      subtitle = isTargetMe
        ? '👉 Select 1 property to KEEP and assign destination players for the rest!'
        : `Waiting for ${targetDisplay} to reposition their properties...`;
    } else if (pending.status === 'AWAITING_TAX_COLLECTOR') {
      icon = '🏛️';
      badgeText = 'Tax Collector';
      borderColor = 'border-amber-400 ring-2 ring-amber-400/30';
      badgeBg = 'bg-amber-500/25 text-amber-300 border-amber-400/50';
      title = `${attackerDisplay} played Tax Collector on ${targetDisplay}!`;
      subtitle = isTargetMe
        ? '👉 Keep 1 card from your Bank and give 1 card to each other player!'
        : `Waiting for ${targetDisplay} to redistribute Bank cards...`;
    } else {
      // AWAITING_JSN
      icon = '🛑';
      badgeText = 'Action Pending';
      borderColor = 'border-red-500 ring-2 ring-red-500/30';
      badgeBg = 'bg-red-500/25 text-red-300 border-red-400/50';
      title = `${attackerDisplay} played ${pending.card.name} targeting ${targetDisplay}!`;
      subtitle = isTargetMe
        ? '👉 Play JUST SAY NO to block this action, or click Accept!'
        : `Waiting for ${targetDisplay} to respond or play Just Say No...`;
    }
  } else if (visibleRecentLog) {
    // Categorize live recent log
    const action = visibleRecentLog.action;
    const isMe = visibleRecentLog.playerId === myPlayer.id;
    const pName = isMe ? 'You' : visibleRecentLog.playerName;

    if (action === 'BANK_CARD') {
      icon = '🏦';
      badgeText = 'Bank Deposit';
      badgeBg = 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40';
      borderColor = 'border-emerald-500/60';
      title = `${pName} deposited into Bank`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'PLAY_PROPERTY') {
      icon = '🏠';
      badgeText = 'Property Placed';
      badgeBg = 'bg-cyan-500/25 text-cyan-300 border-cyan-400/40';
      borderColor = 'border-cyan-500/60';
      title = `${pName} put a Property on Table`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'PLAY_WILDCARD') {
      icon = '🌈';
      badgeText = 'Wildcard';
      badgeBg = 'bg-purple-500/25 text-purple-300 border-purple-400/40';
      borderColor = 'border-purple-500/60';
      title = `${pName} placed a Wildcard`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'SHACK_ADDED') {
      icon = '🛖';
      badgeText = 'Shack (+ $3M Rent)';
      badgeBg = 'bg-amber-500/25 text-amber-300 border-amber-400/40';
      borderColor = 'border-amber-500/60';
      title = `${pName} placed a Shack`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'HOUSE_ADDED' || action === 'HOTEL_ADDED') {
      icon = action === 'HOTEL_ADDED' ? '🏨' : '🏠';
      badgeText = action === 'HOTEL_ADDED' ? 'Hotel (+ $4M)' : 'House (+ $3M)';
      badgeBg = 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40';
      borderColor = 'border-emerald-500/60';
      title = `${pName} built a Building Upgrade`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'DRAW_CARDS') {
      icon = '🎴';
      badgeText = 'Cards Drawn';
      badgeBg = 'bg-blue-500/25 text-blue-300 border-blue-400/40';
      borderColor = 'border-blue-500/50';
      title = `${pName} drew Cards`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'PAYMENT_SUBMITTED') {
      icon = '💵';
      badgeText = 'Payment Settled';
      badgeBg = 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40';
      borderColor = 'border-emerald-500/60';
      title = `${pName} paid Debt`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'DEBT_CHIP_SURRENDER') {
      icon = '🪙';
      badgeText = 'Debt Chip';
      badgeBg = 'bg-amber-500/25 text-amber-300 border-amber-400/40';
      borderColor = 'border-amber-500/60';
      title = `${pName} surrendered a Debt Chip`;
      subtitle = visibleRecentLog.details;
    } else if (action === 'ACTION_CANCELLED') {
      icon = '✋';
      badgeText = 'Action Blocked';
      badgeBg = 'bg-rose-500/25 text-rose-300 border-rose-400/40';
      borderColor = 'border-rose-500/60';
      title = 'Blocked by Just Say No!';
      subtitle = visibleRecentLog.details;
    } else if (action === 'DISCARD_EXCESS') {
      icon = '🗑️';
      badgeText = 'Hand Limit (7)';
      badgeBg = 'bg-orange-500/25 text-orange-300 border-orange-400/40';
      borderColor = 'border-orange-500/60';
      title = `${pName} discarded excess cards`;
      subtitle = visibleRecentLog.details;
    } else {
      icon = '⚡';
      badgeText = 'Action Update';
      badgeBg = 'bg-amber-400/20 text-amber-300 border-amber-400/30';
      borderColor = 'border-emerald-500/50';
      title = pName;
      subtitle = visibleRecentLog.details;
    }
  } else {
    // Idle state between plays — perfectly synced to the active player!
    const isMyTurn = gameState.activePlayerId === myPlayer.id;
    const currentPlayNum = Math.min(gameState.playsUsedThisTurn + 1, gameState.maxPlaysPerTurn);

    if (isMyTurn) {
      icon = '🎯';
      badgeText = '👉 Your Turn';
      badgeBg = 'bg-amber-400/25 text-amber-300 border-amber-400/50 animate-pulse';
      borderColor = 'border-amber-400/60 ring-1 ring-amber-400/20';
      title = `YOUR TURN — PLAY ${currentPlayNum} OF ${gameState.maxPlaysPerTurn}`;
      subtitle = `You have played ${gameState.playsUsedThisTurn}/${gameState.maxPlaysPerTurn} cards. Click a card from your hand to play or bank, or click End Turn.`;
    } else {
      icon = '🎲';
      badgeText = `⏳ ${activePlayer?.displayName || 'Opponent'}'s Turn`;
      badgeBg = 'bg-[#133324] text-emerald-300 border-[#1f4d36]';
      borderColor = 'border-[#1f4d36]';
      title = `${(activePlayer?.displayName || 'Opponent').toUpperCase()}'S TURN — PLAY ${currentPlayNum} OF ${gameState.maxPlaysPerTurn}`;
      subtitle = `${activePlayer?.displayName || 'Opponent'} is deciding their next move (${gameState.playsUsedThisTurn}/${gameState.maxPlaysPerTurn} cards played)...`;
    }
  }

  // Active turn shot tracker badge in the upper right of the banner
  const activeTurnPlayer = players.find((p) => p.id === gameState.activePlayerId);
  const shotText = `${gameState.playsUsedThisTurn}/${gameState.maxPlaysPerTurn} plays`;

  return (
    <div className="w-full flex justify-center px-4 my-2 pointer-events-none select-none z-30">
      <div
        className={`max-w-2xl w-full ${containerBg} backdrop-blur-md border ${borderColor} rounded-2xl px-4 py-2.5 shadow-2xl transition-all duration-200 flex items-center gap-3 animate-fade-in pointer-events-auto`}
      >
        <span className="text-2xl flex-shrink-0 animate-bounce">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span
                className={`text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded ${badgeBg} border shadow-sm flex-shrink-0`}
              >
                {badgeText}
              </span>
              <span className="font-heading font-black text-xs uppercase tracking-wide text-amber-200 truncate">
                {title}
              </span>
            </div>

            {/* Current Active Turn & Plays indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                {activeTurnPlayer ? `${activeTurnPlayer.displayName}: ` : ''}
                <strong className="text-amber-300">{shotText}</strong>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-200 font-medium leading-tight truncate mt-1">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
