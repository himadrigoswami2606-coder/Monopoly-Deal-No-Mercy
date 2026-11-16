import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import {
  Room,
  Player,
  WinMode,
  EVENT_START_GAME,
  EVENT_TOGGLE_READY,
  EVENT_SET_WIN_MODE,
  EVENT_LEAVE_ROOM,
} from '../../../shared/types';
import { PlayerCard } from './PlayerCard';

interface LobbyProps {
  room: Room;
  currentPlayer: Player;
  onLeave: () => void;
  errorMessage: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentPlayer,
  onLeave,
  errorMessage,
}) => {
  const { socket } = useSocket();
  const [copied, setCopied] = useState(false);

  const isHost = currentPlayer.isHost;
  const playerCount = room.players.length;
  const canStartCount = playerCount >= room.minPlayers;

  // Non-host players must be ready
  const nonHostPlayers = room.players.filter((p) => !p.isHost);
  const allNonHostsReady = nonHostPlayers.every((p) => p.isReady);
  const canStart = isHost && canStartCount && allNonHostsReady;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = () => {
    socket?.emit(EVENT_TOGGLE_READY);
  };

  const handleModeChange = (mode: WinMode) => {
    if (!isHost) return;
    socket?.emit(EVENT_SET_WIN_MODE, { winMode: mode });
  };

  const handleStartGame = () => {
    if (!canStart) return;
    socket?.emit(EVENT_START_GAME);
  };

  const handleLeaveRoom = () => {
    socket?.emit(EVENT_LEAVE_ROOM);
    onLeave();
  };

  // Up to 6 player slots
  const emptySlotsCount = Math.max(0, 6 - playerCount);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="min-h-screen tabletop-bg p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Leave Lobby</span>
          </button>
          <div className="font-heading tracking-wider font-extrabold text-lg text-slate-100 hidden sm:block">
            GAME LOBBY
          </div>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3.5 py-1.5 rounded-xl shadow">
          <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
            Room Code:
          </span>
          <span className="font-mono font-black text-amber-400 text-base tracking-widest">
            {room.code}
          </span>
          <button
            onClick={handleCopyCode}
            className="ml-1 p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            title="Copy Code"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Roster (2–6 Slots) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <span>Players in Room</span>
                <span className="text-xs font-normal text-slate-400 font-sans">
                  ({playerCount} / 6)
                </span>
              </h2>

              <span className="text-xs text-slate-400 font-medium">
                {playerCount < 2 ? 'Need 1 more player to start' : 'Ready to begin when players are ready'}
              </span>
            </div>

            {/* Error notice if present */}
            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Player Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isSelf={player.id === currentPlayer.id}
                  showLobbyControls={true}
                  onToggleReady={handleToggleReady}
                />
              ))}

              {/* Empty Slots */}
              {emptySlots.map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="rounded-xl border-2 border-dashed border-slate-800 p-4 flex items-center justify-center text-slate-600 text-xs font-medium bg-slate-950/20"
                >
                  Waiting for player {playerCount + index + 1}...
                </div>
              ))}
            </div>

            {/* Non-host self ready toggle row */}
            {!isHost && (
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Status: {currentPlayer.isReady ? 'You are ready!' : 'Mark yourself ready when set'}
                </span>
                <button
                  onClick={handleToggleReady}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow ${
                    currentPlayer.isReady
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {currentPlayer.isReady ? 'Ready ✓ (Click to Cancel)' : 'Mark Ready'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Host Win-Mode Selector & Game Start */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-bold text-slate-100 uppercase tracking-wide">
                  Win Condition
                </h3>
                {isHost ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Host Setting
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Synced with host</span>
                )}
              </div>

              {/* Mode 1: Standard No Mercy */}
              <div
                onClick={() => isHost && handleModeChange(WinMode.STANDARD_NO_MERCY)}
                className={`p-4 rounded-xl border-2 transition-all mb-3 ${
                  isHost ? 'cursor-pointer' : ''
                } ${
                  room.winMode === WinMode.STANDARD_NO_MERCY
                    ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-950/60 border-slate-800 opacity-70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    Mode 1: Standard No Mercy
                  </span>
                  {room.winMode === WinMode.STANDARD_NO_MERCY && (
                    <span className="text-amber-400 text-xs font-black">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400">▪</span>
                    <span><strong>3 Complete Sets</strong> (different colors)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">▪</span>
                    <span><strong>$10M+ Cash</strong> in Bank</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">▪</span>
                    <span><strong>All 3 Debt Chips</strong> held</span>
                  </div>
                </div>
              </div>

              {/* Mode 2: Extended No Mercy */}
              <div
                onClick={() => isHost && handleModeChange(WinMode.EXTENDED_NO_MERCY)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isHost ? 'cursor-pointer' : ''
                } ${
                  room.winMode === WinMode.EXTENDED_NO_MERCY
                    ? 'bg-rose-500/10 border-rose-400 ring-2 ring-rose-400/20 shadow-lg shadow-rose-500/5'
                    : 'bg-slate-950/60 border-slate-800 opacity-70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    Mode 2: Extended No Mercy
                  </span>
                  {room.winMode === WinMode.EXTENDED_NO_MERCY && (
                    <span className="text-rose-400 text-xs font-black">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400">▪</span>
                    <span><strong>4 Complete Sets</strong> (different colors)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">▪</span>
                    <span><strong>$20M+ Cash</strong> in Bank</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400">▪</span>
                    <span><strong>All 3 Debt Chips</strong> held</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Host Start Game Controls */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              {isHost ? (
                <div>
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full py-3.5 px-4 rounded-xl font-heading font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none uppercase tracking-wider text-base"
                  >
                    Start Game
                  </button>
                  {!canStartCount && (
                    <p className="text-[11px] text-slate-500 text-center mt-2">
                      Need at least 2 players to start
                    </p>
                  )}
                  {canStartCount && !allNonHostsReady && (
                    <p className="text-[11px] text-amber-400/80 text-center mt-2">
                      Waiting for all players to click "Ready"
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400">
                  Waiting for host ({room.players.find((p) => p.isHost)?.displayName}) to start...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 max-w-5xl mx-auto w-full pt-4">
        Room code <span className="font-mono text-slate-400">{room.code}</span> • Share this code with friends to join (2 to 6 players)
      </footer>
    </div>
  );
};
