// ============================================================================
// Monopoly Deal: No Mercy — Server Game Engine
// ============================================================================

import {
  Room,
  GameState,
  Player,
  Card,
  CardType,
  ActionType,
  PropertyColor,
  PropertySet,
  DebtChip,
  ActionLogEntry,
} from '../../shared/types';
import { createDeck, shuffleDeck, PROPERTY_CONFIG } from '../../shared/deckConfig';
import { checkWinCondition } from './winCondition';

export class GameEngine {
  /**
   * Initializes a brand-new game in the given room:
   * 1. Creates and shuffles full 112-card deck
   * 2. Issues 3 unique Debt Chips per player (ownerId === currentHolderId === player.id)
   * 3. Deals 5 private cards to each player
   * 4. Initializes property sets and banks for all players
   * 5. Sets turn to first player and draws 2 initial cards (or deals 5 directly)
   */
  static initializeGame(room: Room): GameState {
    const freshDeck = shuffleDeck(createDeck());

    // 1. Give each player 3 Debt Chips and empty board state
    room.players.forEach((player) => {
      player.bank = [];
      player.properties = [];
      player.hand = [];

      // 3 unique Debt Chips owned and held by this player
      const chips: DebtChip[] = [1, 2, 3].map((num) => ({
        id: `chip-${player.id}-${num}`,
        ownerId: player.id,
        currentHolderId: player.id,
      }));
      player.debtChips = chips;

      // Deal 5 cards from deck to player hand
      const initialHand = freshDeck.splice(0, 5);
      player.hand = initialHand;
    });

    const firstPlayer = room.players[0];

    const initialLog: ActionLogEntry = {
      id: `log-${Date.now()}-init`,
      timestamp: Date.now(),
      playerId: firstPlayer.id,
      playerName: firstPlayer.displayName,
      action: 'GAME_STARTED',
      details: `Game started with ${room.players.length} players! Mode: ${
        room.winMode === 'EXTENDED_NO_MERCY' ? 'Extended (4 Sets + $20M + 3 Chips)' : 'Standard (3 Sets + $10M + 3 Chips)'
      }. ${firstPlayer.displayName} plays first.`,
    };

    const gameState: GameState = {
      activePlayerId: firstPlayer.id,
      turnNumber: 1,
      playsUsedThisTurn: 0,
      maxPlaysPerTurn: 3,
      drawPileCount: freshDeck.length,
      discardPile: [],
      actionLog: [initialLog],
      isGameOver: false,
      winnerId: null,
      winBreakdown: null,
    };

    // Store the remaining draw pile in the room state for the engine
    (room as any)._internalDrawPile = freshDeck;

    return gameState;
  }

  /**
   * Draws cards from the draw pile for a player, recycling discard pile if needed.
   */
  static drawCards(room: Room, playerId: string, count: number): Card[] {
    const drawPile: Card[] = (room as any)._internalDrawPile || [];
    const discardPile: Card[] = room.gameState?.discardPile || [];

    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length > 0) {
          // Recycle discard pile
          const recycled = shuffleDeck(discardPile.splice(0, discardPile.length));
          drawPile.push(...recycled);
          GameEngine.addLog(room, playerId, 'DRAW_PILE_RECYCLED', 'Discard pile reshuffled into draw pile.');
        } else {
          // Out of cards
          break;
        }
      }
      const card = drawPile.shift();
      if (card) {
        drawn.push(card);
      }
    }

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.hand.push(...drawn);
    }

    if (room.gameState) {
      room.gameState.drawPileCount = drawPile.length;
    }

    return drawn;
  }

  /**
   * Starts a player's turn by drawing 2 cards (or 5 if hand is empty).
   */
  static startTurnDraw(room: Room, playerId: string): void {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    const cardsToDraw = player.hand.length === 0 ? 5 : 2;
    const drawn = GameEngine.drawCards(room, playerId, cardsToDraw);

    GameEngine.addLog(
      room,
      playerId,
      'DRAW_CARDS',
      `${player.displayName} drew ${drawn.length} cards at turn start.`
    );
  }

  /**
   * Plays a card from the active player's hand.
   */
  static playCard(
    room: Room,
    playerId: string,
    cardId: string,
    options?: { targetColor?: PropertyColor; targetPlayerId?: string }
  ): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }

    if (room.gameState.activePlayerId !== playerId) {
      return { success: false, error: "It is not your turn" };
    }

    if (room.gameState.playsUsedThisTurn >= room.gameState.maxPlaysPerTurn) {
      return { success: false, error: 'No plays remaining this turn (max 3)' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in your hand' };
    }

    const card = player.hand[cardIndex];

    // Handle different card plays
    if (card.type === CardType.MONEY) {
      // Put directly into Bank
      player.hand.splice(cardIndex, 1);
      player.bank.push(card);
      GameEngine.addLog(
        room,
        playerId,
        'BANK_MONEY',
        `${player.displayName} banked $${card.cashValue}M cash.`
      );
    } else if (card.type === CardType.PROPERTY) {
      // Put into property set of this color
      player.hand.splice(cardIndex, 1);
      const color = card.color!;
      let set = player.properties.find((s) => s.color === color);
      if (!set) {
        set = {
          color,
          cards: [],
          house: false,
          hotel: false,
          isComplete: false,
        };
        player.properties.push(set);
      }
      set.cards.push(card);
      const config = PROPERTY_CONFIG[color];
      set.isComplete = config ? set.cards.length >= config.setSize : false;

      GameEngine.addLog(
        room,
        playerId,
        'PLAY_PROPERTY',
        `${player.displayName} laid down ${card.name} (${PROPERTY_CONFIG[color].name}).`
      );
    } else if (card.type === CardType.PROPERTY_WILDCARD) {
      // Choose target color
      const chosenColor = options?.targetColor || card.colors?.[0] || PropertyColor.DARK_BLUE;
      player.hand.splice(cardIndex, 1);
      let set = player.properties.find((s) => s.color === chosenColor);
      if (!set) {
        set = {
          color: chosenColor,
          cards: [],
          house: false,
          hotel: false,
          isComplete: false,
        };
        player.properties.push(set);
      }
      set.cards.push(card);
      const config = PROPERTY_CONFIG[chosenColor];
      set.isComplete = config ? set.cards.length >= config.setSize : false;

      GameEngine.addLog(
        room,
        playerId,
        'PLAY_WILDCARD',
        `${player.displayName} placed wildcard ${card.name} in their ${PROPERTY_CONFIG[chosenColor]?.name || chosenColor} set.`
      );
    } else if (card.type === CardType.ACTION) {
      // Actions: Pass Go, Bank as cash, House/Hotel, etc.
      if (card.actionType === ActionType.PASS_GO) {
        player.hand.splice(cardIndex, 1);
        room.gameState.discardPile.unshift(card);
        GameEngine.drawCards(room, playerId, 2);
        GameEngine.addLog(
          room,
          playerId,
          'PLAY_PASS_GO',
          `${player.displayName} played Pass Go and drew 2 extra cards!`
        );
      } else if (card.actionType === ActionType.HOUSE || card.actionType === ActionType.HOTEL) {
        // Can attach to complete set or bank as cash
        const targetColor = options?.targetColor;
        const set = player.properties.find((s) => s.color === targetColor);
        if (targetColor && set && set.isComplete) {
          player.hand.splice(cardIndex, 1);
          if (card.actionType === ActionType.HOUSE) {
            set.house = true;
            GameEngine.addLog(
              room,
              playerId,
              'ADD_HOUSE',
              `${player.displayName} added a House to their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $3M rent)!`
            );
          } else {
            set.hotel = true;
            GameEngine.addLog(
              room,
              playerId,
              'ADD_HOTEL',
              `${player.displayName} added a Hotel to their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $4M rent)!`
            );
          }
        } else {
          // Default: bank it as cash
          player.hand.splice(cardIndex, 1);
          player.bank.push(card);
          GameEngine.addLog(
            room,
            playerId,
            'BANK_ACTION',
            `${player.displayName} banked ${card.name} as $${card.cashValue}M cash.`
          );
        }
      } else {
        // Other actions can be played or banked as cash
        // If banking:
        player.hand.splice(cardIndex, 1);
        player.bank.push(card);
        GameEngine.addLog(
          room,
          playerId,
          'BANK_ACTION',
          `${player.displayName} banked ${card.name} as $${card.cashValue}M cash.`
        );
      }
    }

    room.gameState.playsUsedThisTurn++;

    // Check win condition after play!
    const winResult = checkWinCondition(player, room.winMode);
    if (winResult.isWinner) {
      room.gameState.isGameOver = true;
      room.gameState.winnerId = player.id;
      room.gameState.winBreakdown = winResult;

      GameEngine.addLog(
        room,
        playerId,
        'GAME_WON',
        `🏆 ${player.displayName} HAS WON THE GAME! (${winResult.details.join(' | ')})`
      );
    }

    return { success: true };
  }

  /**
   * Ends the active player's turn and advances to the next player.
   */
  static endTurn(room: Room, playerId: string): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }

    if (room.gameState.activePlayerId !== playerId) {
      return { success: false, error: 'Not your turn to end' };
    }

    const currentIndex = room.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % room.players.length;
    const nextPlayer = room.players[nextIndex];

    const currentPlr = room.players[currentIndex];
    GameEngine.addLog(
      room,
      playerId,
      'END_TURN',
      `${currentPlr.displayName} ended their turn.`
    );

    room.gameState.activePlayerId = nextPlayer.id;
    room.gameState.turnNumber++;
    room.gameState.playsUsedThisTurn = 0;

    // Next player automatically draws their turn cards
    GameEngine.startTurnDraw(room, nextPlayer.id);

    return { success: true };
  }

  /**
   * Helper to append an entry to the game action log.
   */
  private static addLog(
    room: Room,
    playerId: string,
    action: string,
    details: string
  ): void {
    if (!room.gameState) return;
    const player = room.players.find((p) => p.id === playerId);
    const logEntry: ActionLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      playerId,
      playerName: player?.displayName || 'System',
      action,
      details,
    };
    room.gameState.actionLog.unshift(logEntry);
    // Keep last 50 entries
    if (room.gameState.actionLog.length > 50) {
      room.gameState.actionLog.pop();
    }
  }
}
