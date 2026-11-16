// ============================================================================
// Monopoly Deal: No Mercy — Room & Multiplayer Lobby Manager
// ============================================================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  Room,
  Player,
  WinMode,
  EVENT_CREATE_ROOM,
  EVENT_JOIN_ROOM,
  EVENT_TOGGLE_READY,
  EVENT_SET_WIN_MODE,
  EVENT_START_GAME,
  EVENT_PLAY_CARD,
  EVENT_END_TURN,
  EVENT_DRAW_CARDS,
  EVENT_LEAVE_ROOM,
  EVENT_ROOM_CREATED,
  EVENT_ROOM_JOINED,
  EVENT_ROOM_UPDATED,
  EVENT_GAME_STARTED,
  EVENT_GAME_STATE_UPDATE,
  EVENT_GAME_OVER,
  EVENT_ERROR,
  EVENT_HOST_CHANGED,
  PropertyColor,
} from '../../shared/types';
import { GameEngine } from './gameEngine';
import { toPublicPlayerView } from './winCondition';

// Store all active rooms indexed by room code
const rooms = new Map<string, Room>();

// Lookups for socket id -> room code and player id
const socketToRoomCode = new Map<string, string>();
const socketToPlayerId = new Map<string, string>();

/**
 * Generates an uppercase 6-character room code (avoiding confusing chars like O, 0, I, 1).
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness
  return rooms.has(code) ? generateRoomCode() : code;
}

/**
 * Broadcasts an updated game state to all players in the room,
 * ensuring each player only receives their OWN private hand.
 */
function broadcastGameState(io: SocketIOServer, room: Room): void {
  if (!room.gameState) return;

  const publicPlayers = room.players.map(toPublicPlayerView);

  room.players.forEach((player) => {
    io.to(player.socketId).emit(EVENT_GAME_STATE_UPDATE, {
      gameState: room.gameState,
      myHand: player.hand,
      myPlayer: player,
      players: publicPlayers,
    });
  });

  if (room.gameState.isGameOver && room.gameState.winnerId) {
    const winner = room.players.find((p) => p.id === room.gameState!.winnerId);
    if (winner && room.gameState.winBreakdown) {
      io.to(room.code).emit(EVENT_GAME_OVER, {
        winner: toPublicPlayerView(winner),
        breakdown: room.gameState.winBreakdown,
      });
    }
  }
}

/**
 * Broadcasts lobby / room updates to all connected sockets in the room.
 */
function broadcastRoomUpdate(io: SocketIOServer, room: Room): void {
  io.to(room.code).emit(EVENT_ROOM_UPDATED, { room });
}

/**
 * Registers all Socket.IO lobby & game event handlers for a connected socket.
 */
export function registerRoomEvents(io: SocketIOServer, socket: Socket): void {
  // -------------------------------------------------------------------------
  // 1. CREATE ROOM
  // -------------------------------------------------------------------------
  socket.on(EVENT_CREATE_ROOM, (data: { displayName?: string }) => {
    const displayName = (data?.displayName || 'Player 1').trim().slice(0, 20);
    const roomCode = generateRoomCode();
    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const hostPlayer: Player = {
      id: playerId,
      displayName,
      socketId: socket.id,
      isHost: true,
      isReady: true,
      colorIndex: 0,
      hand: [],
      bank: [],
      properties: [],
      debtChips: [],
    };

    const room: Room = {
      id: `room-${roomCode}`,
      code: roomCode,
      hostId: playerId,
      winMode: WinMode.STANDARD_NO_MERCY,
      players: [hostPlayer],
      gameState: null,
      maxPlayers: 6,
      minPlayers: 2,
    };

    rooms.set(roomCode, room);
    socketToRoomCode.set(socket.id, roomCode);
    socketToPlayerId.set(socket.id, playerId);

    socket.join(roomCode);

    console.log(`[RoomManager] Room created: ${roomCode} by ${displayName} (${socket.id})`);

    socket.emit(EVENT_ROOM_CREATED, { room, player: hostPlayer });
  });

  // -------------------------------------------------------------------------
  // 2. JOIN ROOM
  // -------------------------------------------------------------------------
  socket.on(EVENT_JOIN_ROOM, (data: { code: string; displayName?: string }) => {
    const rawCode = (data?.code || '').trim().toUpperCase();
    const displayName = (data?.displayName || 'Player').trim().slice(0, 20);

    const room = rooms.get(rawCode);
    if (!room) {
      socket.emit(EVENT_ERROR, { message: `Room "${rawCode}" does not exist.` });
      return;
    }

    if (room.gameState !== null) {
      socket.emit(EVENT_ERROR, { message: `Game is already in progress in room ${rawCode}.` });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit(EVENT_ERROR, { message: `Room ${rawCode} is full (max 6 players).` });
      return;
    }

    // Assign next available color index (0 to 5)
    const usedColorIndices = new Set(room.players.map((p) => p.colorIndex));
    let colorIndex = 0;
    for (let i = 0; i < 6; i++) {
      if (!usedColorIndices.has(i)) {
        colorIndex = i;
        break;
      }
    }

    const playerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer: Player = {
      id: playerId,
      displayName,
      socketId: socket.id,
      isHost: false,
      isReady: false,
      colorIndex,
      hand: [],
      bank: [],
      properties: [],
      debtChips: [],
    };

    room.players.push(newPlayer);
    socketToRoomCode.set(socket.id, room.code);
    socketToPlayerId.set(socket.id, playerId);

    socket.join(room.code);

    console.log(`[RoomManager] ${displayName} joined room ${room.code} (${room.players.length}/6)`);

    socket.emit(EVENT_ROOM_JOINED, { room, player: newPlayer });
    broadcastRoomUpdate(io, room);
  });

  // -------------------------------------------------------------------------
  // 3. TOGGLE READY
  // -------------------------------------------------------------------------
  socket.on(EVENT_TOGGLE_READY, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState !== null) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    player.isReady = !player.isReady;
    broadcastRoomUpdate(io, room);
  });

  // -------------------------------------------------------------------------
  // 4. SET WIN MODE (Host Only)
  // -------------------------------------------------------------------------
  socket.on(EVENT_SET_WIN_MODE, (data: { winMode: WinMode }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState !== null) return;

    if (room.hostId !== playerId) {
      socket.emit(EVENT_ERROR, { message: 'Only the host can change game mode.' });
      return;
    }

    if (data.winMode === WinMode.STANDARD_NO_MERCY || data.winMode === WinMode.EXTENDED_NO_MERCY) {
      room.winMode = data.winMode;
      console.log(`[RoomManager] Room ${roomCode} mode changed to ${data.winMode}`);
      broadcastRoomUpdate(io, room);
    }
  });

  // -------------------------------------------------------------------------
  // 5. START GAME (Host Only, Min 2 Players)
  // -------------------------------------------------------------------------
  socket.on(EVENT_START_GAME, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.hostId !== playerId) {
      socket.emit(EVENT_ERROR, { message: 'Only the host can start the game.' });
      return;
    }

    if (room.players.length < room.minPlayers) {
      socket.emit(EVENT_ERROR, {
        message: `At least ${room.minPlayers} players are required to start (currently ${room.players.length}).`,
      });
      return;
    }

    // Check that players are ready
    const nonHostPlayers = room.players.filter((p) => !p.isHost);
    const unreadyPlayers = nonHostPlayers.filter((p) => !p.isReady);
    if (unreadyPlayers.length > 0) {
      socket.emit(EVENT_ERROR, {
        message: `Waiting on ${unreadyPlayers.map((p) => p.displayName).join(', ')} to be ready!`,
      });
      return;
    }

    console.log(`[RoomManager] Starting game in room ${room.code} with ${room.players.length} players...`);

    // Initialize authoritative game state
    const gameState = GameEngine.initializeGame(room);
    room.gameState = gameState;

    // Draw initial turn cards for first player
    GameEngine.startTurnDraw(room, gameState.activePlayerId);

    // Broadcast game start
    room.players.forEach((p) => {
      io.to(p.socketId).emit(EVENT_GAME_STARTED, {
        room,
        myHand: p.hand,
      });
    });

    // Broadcast initial state
    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 6. PLAY CARD
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_PLAY_CARD,
    (data: { cardId: string; targetColor?: PropertyColor; targetPlayerId?: string }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const result = GameEngine.playCard(room, playerId, data.cardId, {
        targetColor: data.targetColor,
        targetPlayerId: data.targetPlayerId,
      });

      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot play card' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 7. END TURN
  // -------------------------------------------------------------------------
  socket.on(EVENT_END_TURN, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState) return;

    const result = GameEngine.endTurn(room, playerId);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot end turn' });
      return;
    }

    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 8. DRAW CARDS
  // -------------------------------------------------------------------------
  socket.on(EVENT_DRAW_CARDS, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState) return;

    if (room.gameState.activePlayerId !== playerId) {
      socket.emit(EVENT_ERROR, { message: "It is not your turn to draw cards." });
      return;
    }

    GameEngine.drawCards(room, playerId, 2);
    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 9. LEAVE ROOM / DISCONNECT
  // -------------------------------------------------------------------------
  const handleLeaveOrDisconnect = () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    socketToRoomCode.delete(socket.id);
    socketToPlayerId.delete(socket.id);

    const room = rooms.get(roomCode);
    if (!room) return;

    const leavingPlayerIndex = room.players.findIndex((p) => p.id === playerId);
    if (leavingPlayerIndex === -1) return;

    const leavingPlayer = room.players[leavingPlayerIndex];
    room.players.splice(leavingPlayerIndex, 1);

    console.log(`[RoomManager] ${leavingPlayer.displayName} left room ${roomCode}`);

    // If room is empty, delete it
    if (room.players.length === 0) {
      rooms.delete(roomCode);
      console.log(`[RoomManager] Room ${roomCode} deleted (empty)`);
      return;
    }

    // If host left, transfer host to next player
    if (leavingPlayer.isHost) {
      const newHost = room.players[0];
      newHost.isHost = true;
      room.hostId = newHost.id;

      console.log(`[RoomManager] Host transferred to ${newHost.displayName} in room ${roomCode}`);
      io.to(roomCode).emit(EVENT_HOST_CHANGED, {
        newHostId: newHost.id,
        newHostName: newHost.displayName,
      });
    }

    broadcastRoomUpdate(io, room);

    if (room.gameState) {
      broadcastGameState(io, room);
    }
  };

  socket.on(EVENT_LEAVE_ROOM, handleLeaveOrDisconnect);
  socket.on('disconnect', handleLeaveOrDisconnect);
}
