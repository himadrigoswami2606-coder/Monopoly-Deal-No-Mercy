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
  EVENT_RESOLVE_DEBT_DRAW,
  EVENT_RESPOND_JUST_SAY_NO,
  EVENT_SUBMIT_PAYMENT,
  EVENT_SUBMIT_REPOSSESS,
  EVENT_SUBMIT_TAX_COLLECTOR,
  EVENT_MOVE_SHACK,
  EVENT_SET_AI_SPEED,
  AISpeed,
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
  } else if (room.gameState.pendingAction) {
    // If pending action awaits a Bot, trigger AI reaction automatically
    triggerBotReactionIfPending(io, room);
  } else {
    // If next player is a Bot, trigger AI automated turn
    triggerBotTurnIfActive(io, room);
  }
}

/**
 * Calculates dynamic delay timings based on the room's AI speed setting.
 */
function getBotSpeedDelay(room: Room): {
  reactionMs: number;
  cardMs: number;
  turnStartMs: number;
  endTurnMs: number;
} {
  const speed = room.aiSpeed || 'NORMAL';
  switch (speed) {
    case 'FAST':
      return { reactionMs: 500, cardMs: 700, turnStartMs: 700, endTurnMs: 500 };
    case 'REALISTIC':
      return { reactionMs: 2000, cardMs: 2600, turnStartMs: 2400, endTurnMs: 1600 };
    case 'SLOW':
      return { reactionMs: 3200, cardMs: 4200, turnStartMs: 4000, endTurnMs: 2500 };
    case 'NORMAL':
    default:
      return { reactionMs: 1000, cardMs: 1600, turnStartMs: 1500, endTurnMs: 1000 };
  }
}

/**
 * Automatically resolves reactions for AI Bot players (Just Say No, Payment, Repossess).
 */
function triggerBotReactionIfPending(io: SocketIOServer, room: Room): void {
  if (!room.gameState?.pendingAction) return;
  const pending = room.gameState.pendingAction;
  const bot = room.players.find((p) => p.id === pending.currentAwaitingPlayerId && p.isBot);
  if (!bot) return;

  const delays = getBotSpeedDelay(room);

  setTimeout(() => {
    if (!room.gameState?.pendingAction || room.gameState.pendingAction.id !== pending.id) return;
    if (room.gameState.pendingAction.currentAwaitingPlayerId !== bot.id) return;

    if (pending.status === 'AWAITING_JSN') {
      const hasJSN = bot.hand.some(
        (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
      );
      if (hasJSN) {
        GameEngine.respondJustSayNo(room, bot.id, pending.id, false);
      } else {
        GameEngine.respondJustSayNo(room, bot.id, pending.id, true);
      }
      broadcastGameState(io, room);
    } else if (pending.status === 'AWAITING_PAYMENT') {
      const amountDue = pending.rentAmount || 1;
      const selectedIds: string[] = [];
      let paid = 0;

      // 1. Pay with cash from bank
      for (const card of bot.bank) {
        if (paid >= amountDue) break;
        selectedIds.push(card.id);
        paid += card.cashValue;
      }

      // 2. Pay with properties if bank was not enough
      if (paid < amountDue) {
        for (const set of bot.properties) {
          if (paid >= amountDue) break;
          if (!set.isComplete) {
            for (const card of set.cards) {
              if (paid >= amountDue) break;
              selectedIds.push(card.id);
              paid += card.cashValue;
            }
          }
        }
      }

      // 3. Surrender debt chip if insolvent
      const surrenderDebtChip = paid < amountDue && bot.debtChips.length > 0;
      GameEngine.submitPayment(room, bot.id, pending.id, selectedIds, surrenderDebtChip);
      broadcastGameState(io, room);
    } else if (pending.status === 'AWAITING_REPOSSESS') {
      const allCards = bot.properties.flatMap((s) => s.cards);
      allCards.sort((a, b) => b.cashValue - a.cashValue);
      const keepCard = allCards[0];
      const otherCards = allCards.slice(1);
      const distributions = otherCards.map((c) => ({
        cardId: c.id,
        targetPlayerId: pending.attackerId,
      }));
      GameEngine.submitRepossess(room, bot.id, pending.id, keepCard?.id || '', distributions);
      broadcastGameState(io, room);
    } else if (pending.status === 'AWAITING_TAX_COLLECTOR') {
      const bankCards = [...bot.bank].sort((a, b) => b.cashValue - a.cashValue);
      const keepCard = bankCards[0];
      const otherCards = bankCards.slice(1);
      const otherPlayers = room.players.filter((p) => p.id !== bot.id);
      const distributions = otherCards.map((c, idx) => ({
        cardId: c.id,
        targetPlayerId: otherPlayers[idx % otherPlayers.length].id,
      }));
      GameEngine.submitTaxCollector(room, bot.id, pending.id, keepCard?.id || '', distributions);
      broadcastGameState(io, room);
    }
  }, delays.reactionMs);
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

  // 1. Super Sly Deal & Deal Breaker: Steal complete sets!
  const dealBreakerCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.DEAL_BREAKER
  );
  if (dealBreakerCard) {
    for (const opp of opponents) {
      const completeSet = opp.properties.find((s) => s.isComplete);
      if (completeSet) {
        return {
          cardId: dealBreakerCard.id,
          options: {
            targetPlayerId: opp.id,
            targetColor: completeSet.color,
          },
        };
      }
    }
  }

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

  // 1B. Market Crash: Dismantle properties across all opponents!
  const marketCrashCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.MARKET_CRASH
  );
  if (marketCrashCard && opponents.some((o) => o.properties.some((s) => s.cards.length > 0))) {
    return { cardId: marketCrashCard.id };
  }

  // 2. Pass Go / Pass Go, Go, Go!: Refills hand up to 7 cards (Point 3)
  const passGoCard = hand.find(
    (c) =>
      c.type === CardType.ACTION &&
      (c.actionType === ActionType.PASS_GO_GO_GO || c.actionType === ActionType.PASS_GO)
  );
  if (passGoCard && bot.hand.length < 7) {
    return { cardId: passGoCard.id };
  }

  // 2B. Go Again: Take another full turn immediately! (Point 2)
  const goAgainCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.GO_AGAIN
  );
  if (goAgainCard && (room.gameState?.playsUsedThisTurn || 0) >= 1) {
    return { cardId: goAgainCard.id };
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

  // 5B. Heist: Raid every opponent's bank!
  const heistCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.HEIST
  );
  if (heistCard && opponents.some((o) => o.bank.length > 0)) {
    return { cardId: heistCard.id };
  }

  // 5C. Unfair Trade: Swap entire bank if bot has bank cards and opponent is richer!
  const unfairTradeCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.UNFAIR_TRADE
  );
  if (unfairTradeCard && bot.bank.length > 0) {
    const botBankVal = bot.bank.reduce((sum, c) => sum + c.cashValue, 0);
    const richerOpp = opponents
      .filter((o) => o.bank.reduce((sum, c) => sum + c.cashValue, 0) > botBankVal)
      .sort((a, b) => b.bank.reduce((sum, c) => sum + c.cashValue, 0) - a.bank.reduce((sum, c) => sum + c.cashValue, 0))[0];
    if (richerOpp) {
      return { cardId: unfairTradeCard.id, options: { targetPlayerId: richerOpp.id } };
    }
  }

  // 5D. Tax Collector: Force richest opponent to distribute their bank!
  const taxCollectorCard = hand.find(
    (c) => c.type === CardType.ACTION && c.actionType === ActionType.TAX_COLLECTOR
  );
  if (taxCollectorCard) {
    const richestWithBank = opponents
      .filter((o) => o.bank.length > 1)
      .sort((a, b) => b.bank.reduce((sum, c) => sum + c.cashValue, 0) - a.bank.reduce((sum, c) => sum + c.cashValue, 0))[0];
    if (richestWithBank) {
      return { cardId: taxCollectorCard.id, options: { targetPlayerId: richestWithBank.id } };
    }
  }

  // 6. Forced Debt: Steal 1 Debt Chip from opponent (Point 10)
  const forcedDebtCard = hand.find(
    (c) =>
      c.type === CardType.ACTION &&
      c.actionType === ActionType.FORCED_DEBT
  );
  if (forcedDebtCard) {
    const oppWithChips = opponents.find((o) => o.debtChips.length > 0) || opponents[0];
    if (oppWithChips) {
      return {
        cardId: forcedDebtCard.id,
        options: { targetPlayerId: oppWithChips.id },
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

  const delays = getBotSpeedDelay(room);

  setTimeout(() => {
    if (!room.gameState || room.gameState.isGameOver || room.gameState.activePlayerId !== activePlayer.id) return;

    let currentPlayIndex = 0;

    function executeNextPlay() {
      if (!room.gameState || room.gameState.isGameOver || room.gameState.activePlayerId !== activePlayer!.id) return;

      if (room.gameState.pendingAction) {
        setTimeout(executeNextPlay, delays.reactionMs);
        return;
      }

      if (
        room.gameState.playsUsedThisTurn < room.gameState.maxPlaysPerTurn &&
        activePlayer!.hand.length > 0 &&
        currentPlayIndex < 6
      ) {
        const playDecision = chooseBotCardPlay(room, activePlayer!);
        if (playDecision) {
          GameEngine.playCard(room, activePlayer!.id, playDecision.cardId, playDecision.options);
          currentPlayIndex++;
          broadcastGameState(io, room);

          if (!room.gameState.isGameOver && room.gameState.playsUsedThisTurn < room.gameState.maxPlaysPerTurn) {
            setTimeout(executeNextPlay, delays.cardMs);
            return;
          }
        }
      }

      // End Bot turn after plays are complete
      setTimeout(() => {
        if (
          room.gameState &&
          !room.gameState.isGameOver &&
          room.gameState.activePlayerId === activePlayer!.id &&
          !room.gameState.pendingAction
        ) {
          GameEngine.endTurn(room, activePlayer!.id);
          broadcastGameState(io, room);
        }
      }, delays.endTurnMs);
    }

    executeNextPlay();
  }, delays.turnStartMs);
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
  // 5B. SET AI SPEED (Fast, Normal, Realistic, Slow)
  // -------------------------------------------------------------------------
  socket.on(EVENT_SET_AI_SPEED, (data: { speed: AISpeed }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (['FAST', 'NORMAL', 'REALISTIC', 'SLOW'].includes(data?.speed)) {
      room.aiSpeed = data.speed;
      broadcastRoomUpdate(io, room);
      if (room.gameState) {
        broadcastGameState(io, room);
      }
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
    if (room.gameState) {
      // Game already initialized, prevent duplicate starts
      return;
    }

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
  // 8. FLIP WILDCARD BETWEEN ELIGIBLE PROPERTY SETS (Costs 1 Play - Point 5 & 9)
  // -------------------------------------------------------------------------
  socket.on(EVENT_FLIP_WILDCARD, (data: { cardId: string; toColor: PropertyColor }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    const result = GameEngine.flipWildcard(room, playerId, data.cardId, data.toColor);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot flip wildcard' });
      return;
    }

    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 8A-2. MOVE SHACK BETWEEN PROPERTY SETS (Costs 1 Play - Point 7)
  // -------------------------------------------------------------------------
  socket.on(EVENT_MOVE_SHACK, (data: { fromColor: PropertyColor; toColor: PropertyColor }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    const result = GameEngine.moveShack(room, playerId, data.fromColor, data.toColor);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot move shack' });
      return;
    }

    broadcastGameState(io, room);
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
  // 8C. RESOLVE DEBT RECOVERY FROM TURN START DRAW (Points 4 & 5)
  // -------------------------------------------------------------------------
  socket.on(EVENT_RESOLVE_DEBT_DRAW, (data: { chosenCardId: string }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState || room.gameState.activePlayerId !== playerId) return;

    const result = GameEngine.resolveDebtDraw(room, playerId, data.chosenCardId);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot resolve debt draw' });
      return;
    }

    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 8D. JUST SAY NO RESPONSE (Point 1)
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_RESPOND_JUST_SAY_NO,
    (data: {
      actionId?: string;
      accept?: boolean;
      playJustSayNo?: boolean;
      justSayNoCardId?: string;
    }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const actionId = data?.actionId || room.gameState.pendingAction?.id;
      if (!actionId) return;

      const accept = data?.accept !== undefined ? data.accept : !data?.playJustSayNo;
      const result = GameEngine.respondJustSayNo(
        room,
        playerId,
        actionId,
        accept,
        data?.justSayNoCardId
      );
      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot respond to action' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 8E. SUBMIT PAYMENT (Point 6 & 10)
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_SUBMIT_PAYMENT,
    (data: {
      actionId?: string;
      selectedCardIds?: string[];
      cardIds?: string[];
      surrenderDebtChip?: boolean;
    }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const actionId = data?.actionId || room.gameState.pendingAction?.id;
      if (!actionId) {
        socket.emit(EVENT_ERROR, { message: 'No active payment demand found' });
        return;
      }

      const cardIds = data?.selectedCardIds || data?.cardIds || [];
      const result = GameEngine.submitPayment(
        room,
        playerId,
        actionId,
        cardIds,
        data?.surrenderDebtChip
      );
      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot submit payment' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 8F. SUBMIT REPOSSESSION (Point 7)
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_SUBMIT_REPOSSESS,
    (data: {
      actionId?: string;
      keepCardId?: string;
      distributions?: { cardId: string; targetPlayerId: string }[];
    }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const actionId = data?.actionId || room.gameState.pendingAction?.id;
      if (!actionId || !data?.keepCardId) {
        socket.emit(EVENT_ERROR, { message: 'No active repossession found' });
        return;
      }

      const result = GameEngine.submitRepossess(
        room,
        playerId,
        actionId,
        data.keepCardId,
        data.distributions || []
      );
      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot submit repossession' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 8G. SUBMIT TAX COLLECTOR (Official No Mercy Rule)
  // -------------------------------------------------------------------------
  socket.on(
    EVENT_SUBMIT_TAX_COLLECTOR,
    (data: {
      actionId?: string;
      keepCardId?: string;
      distributions?: { cardId: string; targetPlayerId: string }[];
    }) => {
      const roomCode = socketToRoomCode.get(socket.id);
      const playerId = socketToPlayerId.get(socket.id);
      if (!roomCode || !playerId) return;

      const room = rooms.get(roomCode);
      if (!room || !room.gameState) return;

      const actionId = data?.actionId || room.gameState.pendingAction?.id;
      if (!actionId || !data?.keepCardId) {
        socket.emit(EVENT_ERROR, { message: 'No active tax collector action found' });
        return;
      }

      const result = GameEngine.submitTaxCollector(
        room,
        playerId,
        actionId,
        data.keepCardId,
        data.distributions || []
      );
      if (!result.success) {
        socket.emit(EVENT_ERROR, { message: result.error || 'Cannot submit tax collector' });
        return;
      }

      broadcastGameState(io, room);
    }
  );

  // -------------------------------------------------------------------------
  // 9. END TURN (Point 2: choice of discard if hand > 7)
  // -------------------------------------------------------------------------
  socket.on(EVENT_END_TURN, (data?: { discardCardIds?: string[] }) => {
    const roomCode = socketToRoomCode.get(socket.id);
    const playerId = socketToPlayerId.get(socket.id);
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room || !room.gameState) return;

    const result = GameEngine.endTurn(room, playerId, data?.discardCardIds);
    if (!result.success) {
      socket.emit(EVENT_ERROR, { message: result.error || 'Cannot end turn' });
      return;
    }

    broadcastGameState(io, room);
  });

  // -------------------------------------------------------------------------
  // 9B. DRAW CARDS (Point 3: Manual deck clicking disabled)
  // -------------------------------------------------------------------------
  socket.on(EVENT_DRAW_CARDS, () => {
    socket.emit(EVENT_ERROR, {
      message: 'Manual deck draw is disabled. Cards are dealt automatically at the start of your turn.',
    });
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
