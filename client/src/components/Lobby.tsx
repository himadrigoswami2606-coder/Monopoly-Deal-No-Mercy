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
  EVENT_ADD_BOT,
  EVENT_REMOVE_BOT,
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isHost = currentPlayer.isHost;
  const playerCount = room.players.length;
  const canStartCount = playerCount >= room.minPlayers;

  // Non-host human players must be ready
  const nonHostHumans = room.players.filter((p) => !p.isHost && !p.isBot);
  const allNonHostsReady = nonHostHumans.every((p) => p.isReady);
  const canStart = isHost && canStartCount && allNonHostsReady && !isStarting;

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleReady = () => {
    socket?.emit(EVENT_TOGGLE_READY);
  };

  const handleAddBot = () => {
    if (!isHost) return;
    socket?.emit(EVENT_ADD_BOT);
  };

  const handleRemoveBot = (botId: string) => {
    if (!isHost) return;
    socket?.emit(EVENT_REMOVE_BOT, { botId });
  };

  const handleModeChange = (mode: WinMode) => {
    if (!isHost) return;
    socket?.emit(EVENT_SET_WIN_MODE, { winMode: mode });
  };

  const handleStartGame = () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    socket?.emit(EVENT_START_GAME);
  };

  const handleLeaveRoom = () => {
    socket?.emit(EVENT_LEAVE_ROOM);
    onLeave();
  };

  const emptySlotsCount = Math.max(0, 6 - playerCount);
  const emptySlots = Array.from({ length: emptySlotsCount });

  return (
    <div className="min-h-screen felt-tabletop p-4 md:p-8 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="px-3 py-1.5 rounded-lg bg-[#081a12] border border-[#1f4d36] hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <span>←</span>
            <span>Leave Lobby</span>
          </button>
          <div className="font-heading tracking-wider font-extrabold text-lg text-slate-100 hidden sm:block">
            GAME LOBBY
          </div>
        </div>

        {/* Room Code & Copy Link Pill */}
        <div className="flex items-center gap-2 bg-[#0c2217] border border-[#1f4d36] px-3.5 py-1.5 rounded-2xl shadow">
          <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
            Room:
          </span>
          <span className="font-mono font-black text-amber-400 text-base tracking-widest">
            {room.code}
          </span>
          <button
            onClick={handleCopyInviteLink}
            className="ml-2 py-1 px-3 rounded-lg bg-[#184a32] hover:bg-[#226344] text-amber-300 text-xs font-bold transition-all border border-[#2d6a4f]"
            title="Copy 1-Click Invite Link"
          >
            {copiedLink ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Roster (2–6 Slots) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#102b1e]/90 border border-[#1f4d36] rounded-3xl p-5 md:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-lg font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <span>Players in Room</span>
                <span className="text-xs font-normal text-slate-400 font-sans">
                  ({playerCount} / 6)
                </span>
              </h2>

              {isHost && playerCount < 6 && (
                <button
                  onClick={handleAddBot}
                  className="px-3 py-1 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                >
                  <span>🤖</span>
                  <span>+ Add AI Bot</span>
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Player Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((player) => (
                <div key={player.id} className="relative group">
                  <PlayerCard
                    player={player}
                    isSelf={player.id === currentPlayer.id}
                    showLobbyControls={true}
                    onToggleReady={handleToggleReady}
                  />
                  {isHost && player.isBot && (
                    <button
                      onClick={() => handleRemoveBot(player.id)}
                      className="absolute top-2 right-2 text-rose-400 hover:text-rose-200 text-xs font-bold px-1.5 py-0.5 rounded bg-black/40 border border-rose-500/30"
                      title="Remove Bot"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
              ))}

              {/* Empty Slots */}
              {emptySlots.map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="rounded-2xl border-2 border-dashed border-[#1f4d36] p-4 flex items-center justify-center text-slate-500 text-xs font-medium bg-[#081a12]/30"
                >
                  Waiting for player {playerCount + index + 1}...
                </div>
              ))}
            </div>

            {/* Non-host self ready toggle row */}
            {!isHost && (
              <div className="mt-5 pt-4 border-t border-[#1b3d2b] flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  Status: {currentPlayer.isReady ? 'You are ready!' : 'Mark yourself ready when set'}
                </span>
                <button
                  onClick={handleToggleReady}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow ${
                    currentPlayer.isReady
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
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
          <div className="bg-[#102b1e]/90 border border-[#1f4d36] rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-bold text-slate-100 uppercase tracking-wide">
                  Victory Rules
                </h3>
                {isHost ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Host Control
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Synced</span>
                )}
              </div>

              {/* Mode 1 */}
              <div
                onClick={() => isHost && handleModeChange(WinMode.STANDARD_NO_MERCY)}
                className={`p-4 rounded-2xl border-2 transition-all mb-3 ${
                  isHost ? 'cursor-pointer' : ''
                } ${
                  room.winMode === WinMode.STANDARD_NO_MERCY
                    ? 'bg-[#184a32] border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                    : 'bg-[#0b2318] border-[#1f4d36] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    Standard No Mercy
                  </span>
                  {room.winMode === WinMode.STANDARD_NO_MERCY && (
                    <span className="text-amber-400 text-xs font-black">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div>▪ <strong>3 Complete Sets</strong> (different colors)</div>
                  <div>▪ <strong>$10M+ Cash</strong> in Bank</div>
                  <div>▪ <strong>All 3 Debt Chips</strong> held</div>
                </div>
              </div>

              {/* Mode 2 */}
              <div
                onClick={() => isHost && handleModeChange(WinMode.EXTENDED_NO_MERCY)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isHost ? 'cursor-pointer' : ''
                } ${
                  room.winMode === WinMode.EXTENDED_NO_MERCY
                    ? 'bg-[#184a32] border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                    : 'bg-[#0b2318] border-[#1f4d36] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    Extended No Mercy
                  </span>
                  {room.winMode === WinMode.EXTENDED_NO_MERCY && (
                    <span className="text-amber-400 text-xs font-black">✓ Active</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div>▪ <strong>4 Complete Sets</strong> (different colors)</div>
                  <div>▪ <strong>$20M+ Cash</strong> in Bank</div>
                  <div>▪ <strong>All 3 Debt Chips</strong> held</div>
                </div>
              </div>
            </div>

            {/* Host Start Game Controls */}
            <div className="mt-6 pt-4 border-t border-[#1b3d2b]">
              {isHost ? (
                <div>
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="w-full py-3.5 px-4 rounded-2xl font-heading font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none uppercase tracking-wider text-base border border-amber-300"
                  >
                    Start Game
                  </button>
                  {!canStartCount && (
                    <p className="text-[11px] text-amber-300/80 text-center mt-2">
                      Need at least 2 players (add a bot or invite a friend!)
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
        Share the invite link with friends • Play live 2–6 players or add bots
      </footer>
    </div>
  );
};
