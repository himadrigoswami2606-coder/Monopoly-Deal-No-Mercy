// ============================================================================
// Monopoly Deal: No Mercy — Room & Multiplayer Lobby Manager
// ============================================================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  Room,
  Player,
  WinMode,
  CardType,
  ActionType,
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
  EVENT_SEND_EMOTE,
  EVENT_EMOTE_RECEIVED,
  EVENT_ADD_BOT,
  EVENT_REMOVE_BOT,
  EVENT_FLIP_WILDCARD,
  PropertyColor,
} from '../../shared/types';
import { GameEngine } from './gameEngine';
import { toPublicPlayerView } from './winCondition';
import { PROPERTY_CONFIG } from '../../shared/deckConfig';

// Store all active rooms indexed by room code
const rooms = new Map<string, Room>();

// Lookups for socket id -> room code and player id
const socketToRoomCode = new Map<string, string>();
const socketToPlayerId = new Map<string, string>();

const BOT_NAMES = ['Mr. Monopoly', 'Tycoon Penny', 'Banker Cash', 'Baron Greed', 'Sly Fox'];

/**
 * Generates an uppercase 6-character room code (avoiding confusing chars like O, 0, I, 1).
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
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
    if (!player.isBot) {
      io.to(player.socketId).emit(EVENT_GAME_STATE_UPDATE, {
        gameState: room.gameState!,
        myHand: player.hand,
        myPlayer: player,
        players: publicPlayers,
      });
    }
  });

  if (room.gameState.isGameOver && room.gameState.winnerId) {
    const winner = room.players.find((p) => p.id === room.gameState!.winnerId);
    if (winner && room.gameState.winBreakdown) {
      io.to(room.code).emit(EVENT_GAME_OVER, {
        winner: toPublicPlayerView(winner),
        breakdown: room.gameState.winBreakdown,
      });
    }
  } else {
    // If next player is a Bot, trigger AI automated turn
    triggerBotTurnIfActive(io, room);
  }
}

/**
 * Automated AI Bot turn execution
 */
function triggerBotTurnIfActive(io: SocketIOServer, room: Room): void {
  if (!room.gameState || room.gameState.isGameOver) return;

  const activePlayer = room.players.find((p) => p.id === room.gameState!.activePlayerId);
  if (!activePlayer || !activePlayer.isBot) return;

  setTimeout(() => {
    if (!room.gameState || room.gameState.isGameOver || room.gameState.activePlayerId !== activePlayer.id) return;

    // AI Bot plays up to 2-3 cards
    let playsCount = 0;
    const handCopy = [...activePlayer.hand];

    for (const card of handCopy) {
      if (playsCount >= 2) break;

      if (card.type === CardType.PROPERTY) {
        GameEngine.playCard(room, activePlayer.id, card.id);
        playsCount++;
      } else if (card.type === CardType.MONEY) {
        GameEngine.playCard(room, activePlayer.id, card.id);
        playsCount++;
      } else if (card.type === CardType.ACTION && card.actionType === ActionType.PASS_GO) {
        GameEngine.playCard(room, activePlayer.id, card.id);
        playsCount++;
      } else if (card.type === CardType.ACTION && card.actionType === ActionType.ITS_MY_BIRTHDAY) {
        GameEngine.playCard(room, activePlayer.id, card.id);
        playsCount++;
      }
    }

    // End Bot turn after a brief delay
    setTimeout(() => {
      if (room.gameState && !room.gameState.isGameOver && room.gameState.activePlayerId === activePlayer.id) {
        GameEngine.endTurn(room, activePlayer.id);
        broadcastGameState(io, room);
      }
    }, 1000);

    broadcastGameState(io, room);
  }, 1200);
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

    console.log(`[RoomManager] Room created: ${roomCode} by ${displayName}`);
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
  // 4. ADD / REMOVE AI BOT PLAYERS (Host Only)
  // -------------------------------------------------------------------------
  socket.on(EVENT_ADD_BOT, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState !== null || room.hostId !== playerId) return;

    if (room.players.length >= room.maxPlayers) {
      socket.emit(EVENT_ERROR, { message: 'Room is already full (max 6 players).' });
      return;
    }

    const usedColorIndices = new Set(room.players.map((p) => p.colorIndex));
    let colorIndex = 0;
    for (let i = 0; i < 6; i++) {
      if (!usedColorIndices.has(i)) {
        colorIndex = i;
        break;
      }
    }

    const botCount = room.players.filter((p) => p.isBot).length;
    const botName = BOT_NAMES[botCount % BOT_NAMES.length];

    const botPlayer: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      displayName: `🤖 ${botName}`,
      socketId: `bot-socket-${Date.now()}`,
      isHost: false,
      isReady: true,
      colorIndex,
      isBot: true,
      hand: [],
      bank: [],
      properties: [],
      debtChips: [],
    };

    room.players.push(botPlayer);
    broadcastRoomUpdate(io, room);
  });

  socket.on(EVENT_REMOVE_BOT, (data: { botId: string }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState !== null || room.hostId !== playerId) return;

    const idx = room.players.findIndex((p) => p.id === data.botId && p.isBot);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      broadcastRoomUpdate(io, room);
    }
  });

  // -------------------------------------------------------------------------
  // 5. SET WIN MODE (Host Only)
  // -------------------------------------------------------------------------
  socket.on(EVENT_SET_WIN_MODE, (data: { winMode: WinMode }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.gameState !== null || room.hostId !== playerId) return;

    if (data.winMode === WinMode.STANDARD_NO_MERCY || data.winMode === WinMode.EXTENDED_NO_MERCY) {
      room.winMode = data.winMode;
      broadcastRoomUpdate(io, room);
    }
  });

  // -------------------------------------------------------------------------
  // 6. START GAME
  // -------------------------------------------------------------------------
  socket.on(EVENT_START_GAME, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || room.hostId !== playerId) return;

    if (room.players.length < room.minPlayers) {
      socket.emit(EVENT_ERROR, {
        message: `At least ${room.minPlayers} players are required to start.`,
      });
      return;
    }

    const nonHostPlayers = room.players.filter((p) => !p.isHost && !p.isBot);
    const unreadyPlayers = nonHostPlayers.filter((p) => !p.isReady);
    if (unreadyPlayers.length > 0) {
      socket.emit(EVENT_ERROR, {
        message: `Waiting on ${unreadyPlayers.map((p) => p.displayName).join(', ')} to be ready!`,
      });
      return;
    }

    const gameState = GameEngine.initializeGame(room);
    room.gameState = gameState;

    GameEngine.startTurnDraw(room, gameState.activePlayerId);

    room.players.forEach((p) => {
      if (!p.isBot) {
        io.to(p.socketId).emit(EVENT_GAME_STARTED, {
          room,
          myHand: p.hand,
        });
      }
    });

    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 7. PLAY CARD
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_PLAY_CARD,
    (data: {
      cardId: string;
      targetColor?: PropertyColor;
      targetPlayerId?: string;
      targetCardId?: string;
      myCardId?: string;
      chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
      asBank?: boolean;
    }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const result = GameEngine.playCard(room, playerId, data.cardId, {
        targetColor: data.targetColor,
        targetPlayerId: data.targetPlayerId,
        targetCardId: data.targetCardId,
        myCardId: data.myCardId,
        chosenCategory: data.chosenCategory,
        asBank: data.asBank,
      });

      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot play card' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 8. FLIP WILDCARD BETWEEN ELIGIBLE PROPERTY SETS (Free Action)
  // -------------------------------------------------------------------------
  socket.on(EVENT_FLIP_WILDCARD, (data: { cardId: string; toColor: PropertyColor }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    // Find wildcard card across property sets
    let foundCard: any = null;
    for (const set of player.properties) {
      const cIdx = set.cards.findIndex((c) => c.id === data.cardId);
      if (cIdx !== -1) {
        foundCard = set.cards.splice(cIdx, 1)[0];
        set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
        if (set.cards.length === 0) {
          player.properties = player.properties.filter((s) => s !== set);
        }
        break;
      }
    }

    if (foundCard) {
      let targetSet = player.properties.find((s) => s.color === data.toColor);
      if (!targetSet) {
        targetSet = { color: data.toColor, cards: [], house: false, hotel: false, isComplete: false };
        player.properties.push(targetSet);
      }
      targetSet.cards.push(foundCard);
      targetSet.isComplete = targetSet.cards.length >= (PROPERTY_CONFIG[data.toColor]?.setSize || 3);

      broadcastGameState(io, room);
    }
  });

  // -------------------------------------------------------------------------
  // 9. END TURN & DRAW CARDS
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

  socket.on(EVENT_DRAW_CARDS, () => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    GameEngine.drawCards(room, playerId, 2);
    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 10. REAL-TIME EMOTES
  // -------------------------------------------------------------------------
  socket.on(EVENT_SEND_EMOTE, (data: { emote: string }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      io.to(room.code).emit(EVENT_EMOTE_RECEIVED, {
        playerId: player.id,
        playerName: player.displayName,
        emote: data.emote,
      });
    }
  });

  // -------------------------------------------------------------------------
  // 11. LEAVE ROOM / DISCONNECT
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

    if (room.players.filter((p) => !p.isBot).length === 0) {
      rooms.delete(roomCode);
      return;
    }

    if (leavingPlayer.isHost) {
      const newHost = room.players.find((p) => !p.isBot) || room.players[0];
      newHost.isHost = true;
      room.hostId = newHost.id;

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
