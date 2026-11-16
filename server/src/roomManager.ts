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
  EVENT_SETTLE_DEBT,
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
 * Decision helper: finds the best card & target options for the bot to play.
 * Follows all official Monopoly Deal No Mercy mechanics & winning strategies.
 */
function chooseBotCardPlay(room: Room, bot: Player): {
  cardId: string;
  options?: {
    targetPlayerId?: string;
    targetColor?: PropertyColor;
    targetCardId?: string;
    myCardId?: string;
    chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
    asBank?: boolean;
  };
} | null {
  const opponents = room.players.filter((p) => p.id !== bot.id);
  const hand = bot.hand;
  if (hand.length === 0) return null;

  // 1. Super Sly Deal: Steal an entire complete set from an opponent!
  const superSlyCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.SUPER_SLY_DEAL
  );
  if (superSlyCard) {
    for (const opp of opponents) {
      const completeSet = opp.properties.find((s) => s.isComplete);
      if (completeSet) {
        return {
          cardId: superSlyCard.id,
          options: {
            targetPlayerId: opp.id,
            targetColor: completeSet.color,
          },
        };
      }
    }
  }

  // 2. Pass Go: Draw 2 cards immediately to expand options
  const passGoCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.PASS_GO
  );
  if (passGoCard) {
    return { cardId: passGoCard.id };
  }

  // 3. Complete an in-progress set using a property or wildcard
  for (const set of bot.properties) {
    if (!set.isComplete) {
      const config = PROPERTY_CONFIG[set.color];
      const needed = config ? config.setSize - set.cards.length : 1;
      if (needed === 1) {
        const matchProp = hand.find(
          (c) => c.type === CardType.PROPERTY && c.color === set.color
        );
        if (matchProp) {
          return { cardId: matchProp.id };
        }
        const matchWild = hand.find(
          (c) =>
            c.type === CardType.PROPERTY_WILDCARD &&
            (c.isRainbow || c.colors?.includes(set.color))
        );
        if (matchWild) {
          return { cardId: matchWild.id, options: { targetColor: set.color } };
        }
      }
    }
  }

  // 4. Sly Deal: Steal 1 property card from an opponent's incomplete set
  const slyDealCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.SLY_DEAL
  );
  if (slyDealCard) {
    for (const opp of opponents) {
      for (const set of opp.properties) {
        if (!set.isComplete && set.cards.length > 0) {
          // Prioritize cards matching bot's incomplete sets
          const matchingBotCard = set.cards.find((c) =>
            bot.properties.some((bs) => bs.color === set.color && !bs.isComplete)
          );
          const targetCard = matchingBotCard || set.cards[0];
          if (targetCard) {
            return {
              cardId: slyDealCard.id,
              options: {
                targetPlayerId: opp.id,
                targetCardId: targetCard.id,
              },
            };
          }
        }
      }
    }
  }

  // 5. Yoink: Steal up to $10M from the wealthiest opponent's bank
  const yoinkCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.YOINK
  );
  if (yoinkCard) {
    const sortedOpponents = [...opponents].sort(
      (a, b) =>
        b.bank.reduce((sum, c) => sum + c.cashValue, 0) -
        a.bank.reduce((sum, c) => sum + c.cashValue, 0)
    );
    const richestOpp = sortedOpponents[0];
    if (richestOpp && richestOpp.bank.length > 0) {
      return {
        cardId: yoinkCard.id,
        options: { targetPlayerId: richestOpp.id },
      };
    }
  }

  // 6. Debt Collector: Demand $5M from opponent
  const debtCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.DEBT_COLLECTOR
  );
  if (debtCard) {
    const oppWithFunds = opponents.find((o) => o.bank.length > 0) || opponents[0];
    if (oppWithFunds) {
      return {
        cardId: debtCard.id,
        options: { targetPlayerId: oppWithFunds.id },
      };
    }
  }

  // 7. Rent & Wild Rent: Charge rent on any set owned by bot
  const rentCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.RENT
  );
  if (rentCard) {
    for (const set of bot.properties) {
      if (set.cards.length > 0) {
        if (rentCard.isWildRent) {
          const richestOpp = opponents[0];
          if (richestOpp) {
            return {
              cardId: rentCard.id,
              options: {
                targetColor: set.color,
                targetPlayerId: richestOpp.id,
              },
            };
          }
        } else if (
          !rentCard.rentColors ||
          rentCard.rentColors.includes(set.color)
        ) {
          return {
            cardId: rentCard.id,
            options: { targetColor: set.color },
          };
        }
      }
    }
  }

  // 8. House / Hotel on complete color sets
  const houseCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.HOUSE
  );
  if (houseCard) {
    const eligibleSet = bot.properties.find(
      (s) =>
        s.isComplete &&
        !s.house &&
        s.color !== PropertyColor.RAILROAD &&
        s.color !== PropertyColor.UTILITY
    );
    if (eligibleSet) {
      return { cardId: houseCard.id, options: { targetColor: eligibleSet.color } };
    }
  }

  const hotelCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.HOTEL
  );
  if (hotelCard) {
    const eligibleSet = bot.properties.find(
      (s) =>
        s.isComplete &&
        s.house &&
        !s.hotel &&
        s.color !== PropertyColor.RAILROAD &&
        s.color !== PropertyColor.UTILITY
    );
    if (eligibleSet) {
      return { cardId: hotelCard.id, options: { targetColor: eligibleSet.color } };
    }
  }

  // 9. Play standard property cards into sets
  const propCard = hand.find((c) => c.type === CardType.PROPERTY);
  if (propCard) {
    return { cardId: propCard.id };
  }

  // 10. Play property wildcard
  const wildCard = hand.find((c) => c.type === CardType.PROPERTY_WILDCARD);
  if (wildCard) {
    const chosenColor = wildCard.colors?.[0] || PropertyColor.DARK_BLUE;
    return { cardId: wildCard.id, options: { targetColor: chosenColor } };
  }

  // 11. Birthday card: collect $2M from everyone
  const bdayCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.ITS_MY_BIRTHDAY
  );
  if (bdayCard) {
    return { cardId: bdayCard.id };
  }

  // 12. Money cards deposited into bank
  const moneyCard = hand.find((c) => c.type === CardType.MONEY);
  if (moneyCard) {
    return { cardId: moneyCard.id, options: { asBank: true } };
  }

  // 13. Bank excess action cards (except Just Say No) to grow cash towards victory
  const anyAction = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType !== ActionType.JUST_SAY_NO
  );
  if (anyAction) {
    return { cardId: anyAction.id, options: { asBank: true } };
  }

  return null;
}

/**
 * Automated AI Bot turn execution with full rule knowledge, debt settlement,
 * and realistic staggered plays.
 */
function triggerBotTurnIfActive(io: SocketIOServer, room: Room): void {
  if (!room.gameState || room.gameState.isGameOver) return;

  const activePlayer = room.players.find((p) => p.id === room.gameState!.activePlayerId);
  if (!activePlayer || !activePlayer.isBot) return;

  setTimeout(() => {
    if (!room.gameState || room.gameState.isGameOver || room.gameState.activePlayerId !== activePlayer.id) return;

    // STEP 1: SETTLING DEBT (Rule from Geeky Hobbies / No Mercy rules)
    // "At the start of your turn if another player has one of your debt chips, you must try to settle the debt."
    const creditor = room.players.find(
      (p) => p.id !== activePlayer.id && p.debtChips.some((chip) => chip.ownerId === activePlayer.id)
    );
    if (creditor && activePlayer.hand.length > 0) {
      // Pick lowest value card to surrender for debt settlement
      const cardToGive = [...activePlayer.hand].sort((a, b) => a.cashValue - b.cashValue)[0];
      GameEngine.settleDebt(room, activePlayer.id, cardToGive.id, creditor.id);
      broadcastGameState(io, room);
    }

    // STEP 2: STAGGERED PLAYS (Up to 3 plays per turn)
    let currentPlayIndex = 0;

    function executeNextPlay() {
      if (!room.gameState || room.gameState.isGameOver || room.gameState.activePlayerId !== activePlayer!.id) return;

      if (
        room.gameState.playsUsedThisTurn < room.gameState.maxPlaysPerTurn &&
        activePlayer!.hand.length > 0 &&
        currentPlayIndex < 3
      ) {
        const playDecision = chooseBotCardPlay(room, activePlayer!);
        if (playDecision) {
          GameEngine.playCard(room, activePlayer!.id, playDecision.cardId, playDecision.options);
          currentPlayIndex++;
          broadcastGameState(io, room);

          if (!room.gameState.isGameOver && room.gameState.playsUsedThisTurn < room.gameState.maxPlaysPerTurn) {
            setTimeout(executeNextPlay, 900);
            return;
          }
        }
      }

      // STEP 3: END BOT TURN AFTER PLAYS ARE COMPLETE
      setTimeout(() => {
        if (room.gameState && !room.gameState.isGameOver && room.gameState.activePlayerId === activePlayer!.id) {
          GameEngine.endTurn(room, activePlayer!.id);
          broadcastGameState(io, room);
        }
      }, 700);
    }

    executeNextPlay();
  }, 1000);
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
  // 8B. SETTLE DEBT CHIP (Official No Mercy Rule)
  // -------------------------------------------------------------------------
  socket.on(EVENT_SETTLE_DEBT, (data: { cardId: string; creditorId: string }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    const result = GameEngine.settleDebt(room, playerId, data.cardId, data.creditorId);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot settle debt' });
      return;
    }

    broadcastGameState(io, room);
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
