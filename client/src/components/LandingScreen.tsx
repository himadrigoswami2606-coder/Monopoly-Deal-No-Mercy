import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { EVENT_CREATE_ROOM, EVENT_JOIN_ROOM } from '../../../shared/types';

interface LandingScreenProps {
  displayName: string;
  setDisplayName: (name: string) => void;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  displayName,
  setDisplayName,
  errorMessage,
  setErrorMessage,
}) => {
  const { socket, isConnected } = useSocket();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.length === 6) {
      setJoinCode(roomParam.toUpperCase());
      setIsJoining(true);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!socket || !isConnected) {
      setErrorMessage('Connecting to game server...');
      return;
    }
    const name = displayName.trim() || 'Player 1';
    setErrorMessage(null);
    socket.emit(EVENT_CREATE_ROOM, { displayName: name });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !isConnected) {
      setErrorMessage('Connecting to game server...');
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setErrorMessage('Please enter a valid 6-character Room Code.');
      return;
    }
    const name = displayName.trim() || 'Player';
    setErrorMessage(null);
    socket.emit(EVENT_JOIN_ROOM, { code, displayName: name });
  };

  return (
    <div className="min-h-screen felt-tabletop flex flex-col justify-between p-4 md:p-8">
      {/* Header bar */}
      <header className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
            M
          </div>
          <span className="font-heading tracking-wider font-extrabold text-xl text-slate-100">
            MONOPOLY DEAL
          </span>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
            {isConnected ? 'Server Online' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Hero / Main Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">
            Multiplayer Card Game
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-heading text-slate-100">
            MONOPOLY DEAL
          </h1>
          <div className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-red-500 mt-1 uppercase">
            NO MERCY
          </div>
          <p className="text-slate-400 mt-3 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Fast-paced, ruthless real-time card warfare for 2 to 6 players. Collect sets, steal properties, and bank millions.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/50">
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs md:text-sm font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Display Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              maxLength={20}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name (e.g. Tycoon Dave)"
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Choice: Create or Join */}
          {!isJoining ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={!isConnected}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-base tracking-wide uppercase font-heading"
              >
                Create New Room
              </button>

              <button
                type="button"
                onClick={() => setIsJoining(true)}
                className="w-full py-3 px-6 rounded-xl font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all text-sm tracking-wider uppercase font-heading"
              >
                Join Existing Room
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  6-Character Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB7X9Z"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 font-mono font-bold tracking-widest text-center text-xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all uppercase"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoining(false)}
                  className="w-1/3 py-3 px-4 rounded-xl font-bold text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 transition-all text-sm uppercase"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isConnected || joinCode.length !== 6}
                  className="w-2/3 py-3 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-sm uppercase font-heading"
                >
                  Enter Room
                </button>
              </div>
            </form>
          )}

          {/* Quick rules highlight */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-amber-400 font-bold text-sm">2–6</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Players</div>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-emerald-400 font-bold text-sm">112</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Card Deck</div>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
              <div className="text-blue-400 font-bold text-sm">3 Chips</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Debt Defense</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 max-w-5xl mx-auto w-full">
        Real-Time Monopoly Deal: No Mercy • Server-authoritative private hands • Built with React & Socket.io
      </footer>
    </div>
  );
};
