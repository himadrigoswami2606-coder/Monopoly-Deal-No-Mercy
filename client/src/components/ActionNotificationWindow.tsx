import React, { useEffect, useState } from 'react';
import { GameState, PublicPlayerView, Player } from '../../../shared/types';

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

  // Track latest action log for recent event banner (lasts 7 seconds)
  const latestLog = gameState.actionLog && gameState.actionLog.length > 0
    ? gameState.actionLog[gameState.actionLog.length - 1]
    : null;

  const [visibleRecentLog, setVisibleRecentLog] = useState<typeof latestLog>(null);

  useEffect(() => {
    if (latestLog) {
      setVisibleRecentLog(latestLog);
      const timer = setTimeout(() => {
        setVisibleRecentLog(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [latestLog?.id]);

  // Determine announcement content
  let icon = '📢';
  let title = '';
  let subtitle = '';
  let borderColor = 'border-amber-400/50';
  let badgeBg = 'bg-amber-400/20 text-amber-300';

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
      borderColor = 'border-amber-400';
      badgeBg = 'bg-amber-500/25 text-amber-300';
      title = `${attackerDisplay} asked $${amount}M from ${targetDisplay}!`;
      subtitle = isTargetMe
        ? 'Choose Bank/Property cards to pay, or surrender a Debt Chip if insolvent!'
        : `Waiting for ${targetDisplay} to select payment cards...`;
    } else if (pending.status === 'AWAITING_REPOSSESS') {
      icon = '🔨';
      borderColor = 'border-rose-400';
      badgeBg = 'bg-rose-500/25 text-rose-300';
      title = `${attackerDisplay} played Repossess on ${targetDisplay}!`;
      subtitle = isTargetMe
        ? 'Select 1 property to KEEP and assign destination players for the rest!'
        : `Waiting for ${targetDisplay} to reposition their properties...`;
    } else {
      // AWAITING_JSN
      icon = '🛑';
      borderColor = 'border-red-400';
      badgeBg = 'bg-red-500/25 text-red-300';
      title = `${attackerDisplay} played ${pending.card.name} against ${targetDisplay}!`;
      subtitle = isTargetMe
        ? 'Play JUST SAY NO to block this action, or Accept!'
        : `Waiting for ${targetDisplay} to respond or play Just Say No...`;
    }
  } else if (visibleRecentLog) {
    icon = '⚡';
    title = visibleRecentLog.playerName;
    subtitle = visibleRecentLog.details;
    borderColor = 'border-emerald-500/50';
    badgeBg = 'bg-emerald-500/20 text-emerald-300';
  } else {
    // Idle state between plays
    const isMyTurn = gameState.activePlayerId === myPlayer.id;
    icon = isMyTurn ? '🎯' : '🎲';
    title = isMyTurn ? 'YOUR TURN' : `${activePlayer?.displayName || 'Opponent'}'s Turn`;
    subtitle = `${gameState.playsUsedThisTurn}/3 cards played this turn`;
    borderColor = isMyTurn ? 'border-amber-400/40' : 'border-[#1f4d36]';
    badgeBg = isMyTurn ? 'bg-amber-400/20 text-amber-300' : 'bg-black/30 text-slate-400';
  }

  return (
    <div className="w-full flex justify-center px-4 my-2 pointer-events-none select-none z-30">
      <div
        className={`max-w-xl w-full bg-[#081a12]/85 backdrop-blur-md border ${borderColor} rounded-2xl px-4 py-2.5 shadow-2xl transition-all duration-300 flex items-center gap-3 animate-fade-in pointer-events-auto`}
      >
        <span className="text-2xl flex-shrink-0 animate-bounce">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded ${badgeBg} border border-white/10`}
            >
              Action Update
            </span>
            <span className="font-heading font-black text-xs uppercase tracking-wide text-amber-200 truncate">
              {title}
            </span>
          </div>
          <p className="text-[11px] text-slate-200 font-medium leading-tight truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
