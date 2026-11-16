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
  PendingAction,
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
   * 5. Sets turn to first player and draws 2 initial cards
   */
  static initializeGame(room: Room): GameState {
    const freshDeck = shuffleDeck(createDeck());

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
      player.hand = freshDeck.splice(0, 5);
    });

    const firstPlayer = room.players[0];

    const initialLog: ActionLogEntry = {
      id: `log-${Date.now()}-init`,
      timestamp: Date.now(),
      playerId: firstPlayer.id,
      playerName: firstPlayer.displayName,
      action: 'GAME_STARTED',
      details: `Game started with ${room.players.length} players! Mode: ${
        room.winMode === 'EXTENDED_NO_MERCY'
          ? 'Extended (4 Sets + $20M + 3 Chips)'
          : 'Standard (3 Sets + $10M + 3 Chips)'
      }. ${firstPlayer.displayName} goes first.`,
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

    (room as any)._internalDrawPile = freshDeck;
    room.gameState = gameState;

    // Point 1: The player with the first turn only picks the 2 cards from deck which makes it 7
    GameEngine.startTurnDraw(room, firstPlayer.id);

    return gameState;
  }

  /**
   * Draws raw cards from draw pile (recycling discard pile if needed) without adding to hand yet.
   */
  static drawCardsRaw(room: Room, count: number): Card[] {
    const drawPile: Card[] = (room as any)._internalDrawPile || [];
    const discardPile: Card[] = room.gameState?.discardPile || [];
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length > 0) {
          const recycled = shuffleDeck(discardPile.splice(0, discardPile.length));
          drawPile.push(...recycled);
          GameEngine.addLog(room, room.gameState?.activePlayerId || '', 'DRAW_PILE_RECYCLED', 'Discard pile reshuffled into draw pile.');
        } else {
          break;
        }
      }
      const card = drawPile.shift();
      if (card) {
        drawn.push(card);
      }
    }

    if (room.gameState) {
      room.gameState.drawPileCount = drawPile.length;
    }

    return drawn;
  }

  /**
   * Draws cards from the draw pile for a player, recycling discard pile if needed, and adds to hand.
   */
  static drawCards(room: Room, playerId: string, count: number): Card[] {
    const drawn = GameEngine.drawCardsRaw(room, count);
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.hand.push(...drawn);
    }
    return drawn;
  }

  /**
   * Helper: places a surrendered card into a creditor's area immediately.
   */
  static giveCardToCreditor(creditor: Player, card: Card): void {
    if (card.type === CardType.PROPERTY) {
      const color = card.color!;
      let set = creditor.properties.find((s) => s.color === color);
      if (!set) {
        set = { color, cards: [], house: false, hotel: false, isComplete: false };
        creditor.properties.push(set);
      }
      set.cards.push(card);
      set.isComplete = set.cards.length >= (PROPERTY_CONFIG[color]?.setSize || 3);
    } else if (card.type === CardType.PROPERTY_WILDCARD) {
      const color = card.colors?.[0] || PropertyColor.DARK_BLUE;
      let set = creditor.properties.find((s) => s.color === color);
      if (!set) {
        set = { color, cards: [], house: false, hotel: false, isComplete: false };
        creditor.properties.push(set);
      }
      set.cards.push(card);
      set.isComplete = set.cards.length >= (PROPERTY_CONFIG[color]?.setSize || 3);
    } else {
      creditor.bank.push(card);
    }
  }

  /**
   * Starts a player's turn:
   * 1. Checks if any opponents hold this player's Debt Chips (FIFO priority: person who got the chip first has top priority).
   * 2. Draws 2 cards from deck (or 5 if hand is empty).
   * 3. If no debt chips owed: puts 2 cards in hand, playsUsedThisTurn = 0.
   * 4. If debt chips owed (Points 4 & 5):
   *    - Keeps drawn cards separate (unmixed with hand).
   *    - If Bot: settles automatically (1 chip = 1 play used; 2 chips = 2 plays used).
   *    - If Human: sets room.gameState.pendingDebtSettlement for the player to choose.
   */
  static startTurnDraw(room: Room, playerId: string): void {
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !room.gameState) return;

    const cardsToDraw = player.hand.length === 0 ? 5 : 2;
    const drawn = GameEngine.drawCardsRaw(room, cardsToDraw);

    // Find all debt chips owned by this player that are currently held by opponents
    const owedChips: { chip: DebtChip; creditor: Player }[] = [];
    room.players.forEach((other) => {
      if (other.id !== playerId) {
        other.debtChips.forEach((chip) => {
          if (chip.ownerId === playerId) {
            owedChips.push({ chip, creditor: other });
          }
        });
      }
    });

    // Point 4: The person who has my debt chip first will get the priority of getting the card from me (FIFO)
    owedChips.sort((a, b) => (a.chip.acquiredAt || 0) - (b.chip.acquiredAt || 0));

    if (owedChips.length === 0) {
      // No debt chips owed! Both drawn cards go straight into hand
      player.hand.push(...drawn);
      room.gameState.pendingDebtSettlement = null;
      room.gameState.playsUsedThisTurn = 0;
      GameEngine.addLog(
        room,
        playerId,
        'DRAW_CARDS',
        `${player.displayName} drew ${drawn.length} cards at turn start.`
      );
      return;
    }

    // Point 5: Player owes Debt Chips!
    if (player.isBot) {
      if (owedChips.length === 1) {
        // Give 1 card to priority creditor, keep 1 card in hand, uses 1 play (2 shots left)
        const givenCard = drawn[0].cashValue <= drawn[1].cashValue ? drawn[0] : drawn[1];
        const keptCard = givenCard === drawn[0] ? drawn[1] : drawn[0];
        const creditor = owedChips[0].creditor;

        GameEngine.giveCardToCreditor(creditor, givenCard);

        const cIdx = creditor.debtChips.findIndex((c) => c.id === owedChips[0].chip.id);
        if (cIdx !== -1) {
          const [chip] = creditor.debtChips.splice(cIdx, 1);
          chip.currentHolderId = player.id;
          player.debtChips.push(chip);
        }

        player.hand.push(keptCard);
        room.gameState.playsUsedThisTurn = 1; // 1 shot done, 2 shots left
        room.gameState.pendingDebtSettlement = null;

        GameEngine.addLog(
          room,
          playerId,
          'DEBT_RECOVERED',
          `🪙 ${player.displayName} gave drawn card ${givenCard.name} to ${creditor.displayName} (first priority) and reclaimed their Debt Chip! (1 shot used, 2 shots left).`
        );
      } else {
        // 2 or more chips owed: both drawn cards used, both chips reclaimed, uses 2 plays (1 shot left)
        const c1 = owedChips[0].creditor;
        const c2 = owedChips[1].creditor;

        GameEngine.giveCardToCreditor(c1, drawn[0]);
        GameEngine.giveCardToCreditor(c2, drawn[1]);

        const idx1 = c1.debtChips.findIndex((c) => c.id === owedChips[0].chip.id);
        if (idx1 !== -1) {
          const [chip1] = c1.debtChips.splice(idx1, 1);
          chip1.currentHolderId = player.id;
          player.debtChips.push(chip1);
        }
        const idx2 = c2.debtChips.findIndex((c) => c.id === owedChips[1].chip.id);
        if (idx2 !== -1) {
          const [chip2] = c2.debtChips.splice(idx2, 1);
          chip2.currentHolderId = player.id;
          player.debtChips.push(chip2);
        }

        room.gameState.playsUsedThisTurn = 2; // 2 shots done, 1 shot left
        room.gameState.pendingDebtSettlement = null;

        GameEngine.addLog(
          room,
          playerId,
          'DEBT_RECOVERED',
          `🪙 ${player.displayName} surrendered both drawn cards to ${c1.displayName} and ${c2.displayName} to reclaim 2 Debt Chips! (2 shots used, 1 shot left).`
        );
      }
    } else {
      // Human player: staged settlement (cards not mixed into hand yet!)
      room.gameState.pendingDebtSettlement = {
        playerId,
        drawnCards: drawn,
        creditorIds: owedChips.map((o) => o.creditor.id),
      };
      room.gameState.playsUsedThisTurn = 0;
      GameEngine.addLog(
        room,
        playerId,
        'DRAW_DEBT_STAGED',
        `🪙 ${player.displayName} drew 2 cards and must settle debt before cards enter hand.`
      );
    }
  }

  /**
   * Resolves human player's choice of which drawn card to give to recover their Debt Chip(s).
   */
  static resolveDebtDraw(
    room: Room,
    playerId: string,
    chosenCardId: string
  ): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }
    const pending = room.gameState.pendingDebtSettlement;
    if (!pending || pending.playerId !== playerId) {
      return { success: false, error: 'No pending debt settlement for this player' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    // Find owed chips in priority order (Point 4)
    const owedChips: { chip: DebtChip; creditor: Player }[] = [];
    room.players.forEach((other) => {
      if (other.id !== playerId) {
        other.debtChips.forEach((chip) => {
          if (chip.ownerId === playerId) {
            owedChips.push({ chip, creditor: other });
          }
        });
      }
    });
    owedChips.sort((a, b) => (a.chip.acquiredAt || 0) - (b.chip.acquiredAt || 0));

    if (owedChips.length === 0) {
      player.hand.push(...pending.drawnCards);
      room.gameState.pendingDebtSettlement = null;
      return { success: true };
    }

    const drawn = pending.drawnCards;
    if (owedChips.length === 1) {
      const givenIndex = drawn.findIndex((c) => c.id === chosenCardId);
      const givenCard = givenIndex !== -1 ? drawn.splice(givenIndex, 1)[0] : drawn.shift()!;
      const keptCard = drawn[0];
      const creditor = owedChips[0].creditor;

      // Transfer given card to creditor
      GameEngine.giveCardToCreditor(creditor, givenCard);

      // Reclaim debt chip
      const cIdx = creditor.debtChips.findIndex((c) => c.id === owedChips[0].chip.id);
      if (cIdx !== -1) {
        const [chip] = creditor.debtChips.splice(cIdx, 1);
        chip.currentHolderId = player.id;
        player.debtChips.push(chip);
      }

      // Add kept card to hand
      if (keptCard) {
        player.hand.push(keptCard);
      }

      // Point 5: 1 shot is done, 2 shots left
      room.gameState.playsUsedThisTurn = 1;
      room.gameState.pendingDebtSettlement = null;

      GameEngine.addLog(
        room,
        playerId,
        'DEBT_RECOVERED',
        `🪙 ${player.displayName} gave drawn card ${givenCard.name} to ${creditor.displayName} (first priority) to reclaim their Debt Chip! (1 shot used, 2 shots left).`
      );
    } else {
      // 2 or more chips owed: both drawn cards surrendered to reclaim 2 chips
      const c1 = owedChips[0].creditor;
      const c2 = owedChips[1].creditor;
      const card1 = drawn[0];
      const card2 = drawn[1];

      if (card1) GameEngine.giveCardToCreditor(c1, card1);
      if (card2) GameEngine.giveCardToCreditor(c2, card2);

      const idx1 = c1.debtChips.findIndex((c) => c.id === owedChips[0].chip.id);
      if (idx1 !== -1) {
        const [chip1] = c1.debtChips.splice(idx1, 1);
        chip1.currentHolderId = player.id;
        player.debtChips.push(chip1);
      }
      const idx2 = c2.debtChips.findIndex((c) => c.id === owedChips[1].chip.id);
      if (idx2 !== -1) {
        const [chip2] = c2.debtChips.splice(idx2, 1);
        chip2.currentHolderId = player.id;
        player.debtChips.push(chip2);
      }

      // Point 5: 2 shots are done, 1 shot left
      room.gameState.playsUsedThisTurn = 2;
      room.gameState.pendingDebtSettlement = null;

      GameEngine.addLog(
        room,
        playerId,
        'DEBT_RECOVERED',
        `🪙 ${player.displayName} surrendered both drawn cards to ${c1.displayName} and ${c2.displayName} to reclaim 2 Debt Chips! (2 shots used, 1 shot left).`
      );
    }

    GameEngine.checkAndBroadcastWin(room, player);
    return { success: true };
  }

  /**
   * Plays a card from the active player's hand with full No Mercy action logic.
   */
  static playCard(
    room: Room,
    playerId: string,
    cardId: string,
    options?: {
      targetPlayerId?: string;
      targetColor?: PropertyColor;
      targetCardId?: string;
      myCardId?: string;
      chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
      asBank?: boolean;
    }
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

    // Optional override: Bank any action card as cash
    if (options?.asBank || card.type === CardType.MONEY) {
      player.hand.splice(cardIndex, 1);
      player.bank.push(card);
      GameEngine.addLog(
        room,
        playerId,
        'BANK_CARD',
        `${player.displayName} deposited ${card.name} into their Bank ($${card.cashValue}M cash).`
      );
      room.gameState.playsUsedThisTurn++;
      GameEngine.checkAndBroadcastWin(room, player);
      return { success: true };
    }

    // ── 1. PROPERTY CARD ──────────────────────────────────────────────────
    if (card.type === CardType.PROPERTY) {
      player.hand.splice(cardIndex, 1);
      const color = card.color!;
      let set = player.properties.find((s) => s.color === color);
      if (!set) {
        set = { color, cards: [], house: false, hotel: false, isComplete: false };
        player.properties.push(set);
      }
      set.cards.push(card);
      const config = PROPERTY_CONFIG[color];
      set.isComplete = config ? set.cards.length >= config.setSize : false;

      GameEngine.addLog(
        room,
        playerId,
        'PLAY_PROPERTY',
        `${player.displayName} played ${card.name} into their ${PROPERTY_CONFIG[color].name} set.`
      );
    }
    // ── 2. PROPERTY WILDCARD ─────────────────────────────────────────────
    else if (card.type === CardType.PROPERTY_WILDCARD) {
      const chosenColor = options?.targetColor || card.colors?.[0] || PropertyColor.DARK_BLUE;
      player.hand.splice(cardIndex, 1);
      let set = player.properties.find((s) => s.color === chosenColor);
      if (!set) {
        set = { color: chosenColor, cards: [], house: false, hotel: false, isComplete: false };
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
    }
    // ── 3. ACTION CARDS ───────────────────────────────────────────────────
    else if (card.type === CardType.ACTION) {
      player.hand.splice(cardIndex, 1);
      room.gameState.discardPile.unshift(card);

      const isTargetedAction = [
        ActionType.RENT,
        ActionType.ITS_MY_BIRTHDAY,
        ActionType.REPOSSESS,
        ActionType.FORCED_DEBT,
        ActionType.DEBT_COLLECTOR,
        ActionType.SLY_DEAL,
        ActionType.SUPER_SLY_DEAL,
        ActionType.FORCED_DEAL,
        ActionType.YOINK,
        ActionType.TOUGH_LUCK,
      ].includes(card.actionType!);

      if (isTargetedAction) {
        room.gameState.playsUsedThisTurn++;
        const initiated = GameEngine.initiateTargetedAction(room, player, card, options);
        if (!initiated.success) {
          return initiated;
        }
        GameEngine.checkAndBroadcastWin(room, player);
        return { success: true };
      }

      // Self-only action cards:
      switch (card.actionType) {
        case ActionType.PASS_GO_GO_GO:
        case ActionType.PASS_GO: {
          // Point 3: pick card from the deck until i have 7 cards in my hands
          const countToDraw = Math.max(0, 7 - player.hand.length);
          const drawn = countToDraw > 0 ? GameEngine.drawCards(room, playerId, countToDraw) : [];
          GameEngine.addLog(
            room,
            playerId,
            'PLAY_PASS_GO_GO_GO',
            `🚀 ${player.displayName} played ${card.name} and drew ${drawn.length} card${drawn.length !== 1 ? 's' : ''} to refill their hand to 7 cards!`
          );
          break;
        }

        case ActionType.GO_AGAIN: {
          // Point 2: current 3 plays considered and player gets another turn: picks 2 cards, plays 3 plays at that moment
          const drawn = GameEngine.drawCards(room, playerId, 2);
          room.gameState.playsUsedThisTurn = 0; // resets to 0 so player has 3 fresh plays!
          room.gameState.turnNumber++;
          GameEngine.addLog(
            room,
            playerId,
            'PLAY_GO_AGAIN',
            `⚡ ${player.displayName} played GO AGAIN! Drew 2 fresh cards and gets another full turn with 3 fresh plays!`
          );
          GameEngine.checkAndBroadcastWin(room, player);
          return { success: true };
        }

        case ActionType.SHACK:
        case ActionType.HOUSE:
        case ActionType.HOTEL: {
          const targetColor = options?.targetColor;
          const set = player.properties.find((s) => s.color === targetColor);
          if (targetColor && set) {
            if (card.actionType === ActionType.SHACK || !set.isComplete) {
              set.shack = true;
              GameEngine.addLog(room, playerId, 'SHACK_ADDED', `🛖 ${player.displayName} placed a SHACK on their ${PROPERTY_CONFIG[targetColor].name} property (+ $3M rent)!`);
            } else if (card.actionType === ActionType.HOUSE) {
              set.house = true;
              GameEngine.addLog(room, playerId, 'HOUSE_ADDED', `🏠 ${player.displayName} built a House on their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $3M rent)!`);
            } else {
              set.hotel = true;
              GameEngine.addLog(room, playerId, 'HOTEL_ADDED', `🏨 ${player.displayName} built a Hotel on their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $4M rent)!`);
            }
          } else {
            // Bank as cash if no eligible property
            player.bank.push(card);
            GameEngine.addLog(room, playerId, 'BANK_CARD', `${player.displayName} banked ${card.name} as $${card.cashValue}M cash.`);
          }
          break;
        }

        default: {
          player.bank.push(card);
          GameEngine.addLog(room, playerId, 'BANK_CARD', `${player.displayName} banked ${card.name} as $${card.cashValue}M cash.`);
          break;
        }
      }
    }

    room.gameState.playsUsedThisTurn++;
    GameEngine.checkAndBroadcastWin(room, player);
    return { success: true };
  }

  /**
   * Initiates a targeted action against opponent(s):
   * Sets up PendingAction for real-time response if target has Just Say No,
   * or transitions to interactive payment (Rent/Birthday) or repossession,
   * or executes direct action.
   */
  static initiateTargetedAction(
    room: Room,
    player: Player,
    card: Card,
    options?: any
  ): { success: boolean; error?: string } {
    if (!room.gameState) return { success: false, error: 'Game not active' };

    // 1. Identify all target players
    let targets: Player[] = [];
    const targetOpponent = room.players.find((p) => p.id === options?.targetPlayerId);

    let rentAmount = 0;
    if (card.actionType === ActionType.RENT) {
      const color = options?.targetColor as PropertyColor | undefined;
      if (color && PROPERTY_CONFIG[color]) {
        const set = player.properties.find((s) => s.color === color);
        const count = set ? set.cards.length : 0;
        rentAmount = PROPERTY_CONFIG[color]?.rentValues?.[Math.min(count - 1, (PROPERTY_CONFIG[color]?.rentValues?.length || 1) - 1)] || 1;
        if (set?.shack) rentAmount += 3; // Official Shack bonus: + $3M
        if (set?.house) rentAmount += 3;
        if (set?.hotel) rentAmount += 4;
      }
      targets = card.isWildRent && targetOpponent
        ? [targetOpponent]
        : room.players.filter((p) => p.id !== player.id);
    } else if (card.actionType === ActionType.ITS_MY_BIRTHDAY) {
      rentAmount = 2;
      targets = room.players.filter((p) => p.id !== player.id);
    } else if (card.actionType === ActionType.SUPER_SLY_DEAL) {
      const chosenColor = options?.targetColor;
      targets = room.players.filter(
        (p) =>
          p.id !== player.id &&
          p.properties.some(
            (s) =>
              s.cards.some(
                (c) =>
                  c.color === chosenColor ||
                  c.isRainbow ||
                  (c.colors && c.colors.includes(chosenColor))
              )
          )
      );
      if (targets.length === 0 && targetOpponent) {
        targets = [targetOpponent];
      }
    } else {
      targets = targetOpponent ? [targetOpponent] : [];
    }

    if (targets.length === 0) {
      GameEngine.addLog(room, player.id, 'ACTION_NO_TARGET', `${player.displayName} played ${card.name} with no eligible targets.`);
      return { success: true };
    }

    const firstTarget = targets[0];
    const targetHasJSN = firstTarget.hand.some(
      (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
    );

    // If target has Just Say No in hand, stage real-time prompt
    if (targetHasJSN) {
      room.gameState.pendingAction = {
        id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        attackerId: player.id,
        attackerName: player.displayName,
        card,
        actionType: card.actionType!,
        targetPlayerId: firstTarget.id,
        targetPlayerIds: targets.map((t) => t.id),
        currentAwaitingPlayerId: firstTarget.id,
        options,
        rentAmount,
        rentColor: options?.targetColor,
        justSayNoChain: [],
        status: 'AWAITING_JSN',
        createdAt: Date.now(),
      };
      GameEngine.addLog(
        room,
        player.id,
        'ACTION_INITIATED',
        `🎯 ${player.displayName} played ${card.name} targeting ${firstTarget.displayName}!`
      );
      return { success: true };
    }

    // Target does NOT have Just Say No in hand:
    if (card.actionType === ActionType.RENT || card.actionType === ActionType.ITS_MY_BIRTHDAY) {
      room.gameState.pendingAction = {
        id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        attackerId: player.id,
        attackerName: player.displayName,
        card,
        actionType: card.actionType!,
        targetPlayerId: firstTarget.id,
        targetPlayerIds: targets.map((t) => t.id),
        currentAwaitingPlayerId: firstTarget.id,
        options,
        rentAmount,
        rentColor: options?.targetColor,
        justSayNoChain: [],
        status: 'AWAITING_PAYMENT',
        createdAt: Date.now(),
      };
      GameEngine.addLog(
        room,
        player.id,
        'RENT_DEMANDED',
        `📢 ${player.displayName} demanded $${rentAmount}M from ${firstTarget.displayName} with ${card.name}!`
      );
      return { success: true };
    }

    if (card.actionType === ActionType.REPOSSESS) {
      room.gameState.pendingAction = {
        id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        attackerId: player.id,
        attackerName: player.displayName,
        card,
        actionType: card.actionType!,
        targetPlayerId: firstTarget.id,
        targetPlayerIds: [firstTarget.id],
        currentAwaitingPlayerId: firstTarget.id,
        options,
        justSayNoChain: [],
        status: 'AWAITING_REPOSSESS',
        createdAt: Date.now(),
      };
      GameEngine.addLog(
        room,
        player.id,
        'REPOSSESS_INITIATED',
        `🔨 ${player.displayName} played REPOSSESS against ${firstTarget.displayName}!`
      );
      return { success: true };
    }

    // Direct execution for other actions
    GameEngine.executeDirectTargetedAction(room, player, card, options);
    return { success: true };
  }

  /**
   * Directly executes targeted action effect when no JSN is present.
   */
  static executeDirectTargetedAction(
    room: Room,
    player: Player,
    card: Card,
    options?: any
  ): void {
    const targetOpponent = room.players.find((p) => p.id === options?.targetPlayerId);

    switch (card.actionType) {
      case ActionType.FORCED_DEBT:
      case ActionType.DEBT_COLLECTOR: {
        if (targetOpponent) {
          let chipIndex = targetOpponent.debtChips.findIndex((c) => c.ownerId === targetOpponent.id);
          if (chipIndex === -1 && targetOpponent.debtChips.length > 0) chipIndex = 0;
          if (chipIndex !== -1) {
            const [chip] = targetOpponent.debtChips.splice(chipIndex, 1);
            chip.currentHolderId = player.id;
            chip.acquiredAt = Date.now();
            player.debtChips.push(chip);
            GameEngine.addLog(
              room,
              player.id,
              'FORCED_DEBT_SUCCESS',
              `🪙 ${player.displayName} played FORCED DEBT on ${targetOpponent.displayName} and stole 1 Debt Chip!`
            );
          } else {
            GameEngine.addLog(
              room,
              player.id,
              'FORCED_DEBT_EMPTY',
              `${player.displayName} played Forced Debt, but ${targetOpponent.displayName} holds no Debt Chips!`
            );
          }
        }
        break;
      }

      case ActionType.SLY_DEAL: {
        if (targetOpponent && options?.targetCardId) {
          let stolenCard: Card | null = null;
          for (const set of targetOpponent.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options.targetCardId);
              if (cIdx !== -1) {
                stolenCard = set.cards.splice(cIdx, 1)[0];
                set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
                if (set.cards.length === 0) {
                  targetOpponent.properties = targetOpponent.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          if (stolenCard) {
            GameEngine.giveCardToCreditor(player, stolenCard);
            GameEngine.addLog(
              room,
              player.id,
              'SLY_DEAL_SUCCESS',
              `🧤 ${player.displayName} stole ${stolenCard.name} from ${targetOpponent.displayName} via Sly Deal!`
            );
          }
        }
        break;
      }

      case ActionType.SUPER_SLY_DEAL: {
        const chosenColor = options?.targetColor as PropertyColor | undefined;
        if (chosenColor && PROPERTY_CONFIG[chosenColor]) {
          let totalStolen = 0;
          room.players.forEach((opp) => {
            if (opp.id !== player.id) {
              opp.properties.forEach((set) => {
                const stolenFromSet: Card[] = [];
                set.cards = set.cards.filter((c) => {
                  const matches =
                    c.color === chosenColor ||
                    c.isRainbow ||
                    (c.colors && c.colors.includes(chosenColor));
                  if (matches) {
                    stolenFromSet.push(c);
                    return false;
                  }
                  return true;
                });
                if (stolenFromSet.length > 0) {
                  totalStolen += stolenFromSet.length;
                  let mySet = player.properties.find((s) => s.color === chosenColor);
                  if (!mySet) {
                    mySet = { color: chosenColor, cards: [], house: false, hotel: false, shack: false, isComplete: false };
                    player.properties.push(mySet);
                  }
                  if (set.shack) {
                    mySet.shack = true;
                    set.shack = false;
                  }
                  mySet.cards.push(...stolenFromSet);
                  mySet.isComplete = mySet.cards.length >= (PROPERTY_CONFIG[chosenColor]?.setSize || 3);
                }
                set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
              });
              opp.properties = opp.properties.filter((s) => s.cards.length > 0);
            }
          });
          GameEngine.addLog(
            room,
            player.id,
            'SUPER_SLY_DEAL_SUCCESS',
            `👑 ${player.displayName} unleashed SUPER SLY DEAL on ${PROPERTY_CONFIG[chosenColor]?.name || chosenColor}! Stole ALL ${totalStolen} properties across opponents!`
          );
        }
        break;
      }

      case ActionType.FORCED_DEAL: {
        if (targetOpponent && options?.targetCardId && options?.myCardId) {
          let oppCard: Card | null = null;
          for (const set of targetOpponent.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options.targetCardId);
              if (cIdx !== -1) {
                oppCard = set.cards.splice(cIdx, 1)[0];
                set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
                if (set.cards.length === 0) {
                  targetOpponent.properties = targetOpponent.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          let myCard: Card | null = null;
          for (const set of player.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options.myCardId);
              if (cIdx !== -1) {
                myCard = set.cards.splice(cIdx, 1)[0];
                set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
                if (set.cards.length === 0) {
                  player.properties = player.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          if (oppCard && myCard) {
            GameEngine.giveCardToCreditor(player, oppCard);
            GameEngine.giveCardToCreditor(targetOpponent, myCard);
            GameEngine.addLog(
              room,
              player.id,
              'FORCED_DEAL_SUCCESS',
              `🔄 ${player.displayName} forced a swap: gave ${myCard.name} to ${targetOpponent.displayName} for ${oppCard.name}!`
            );
          }
        }
        break;
      }

      case ActionType.YOINK: {
        if (targetOpponent) {
          let stolen = 0;
          while (targetOpponent.bank.length > 0 && stolen < 10) {
            const b = targetOpponent.bank.pop()!;
            stolen += b.cashValue;
            player.bank.push(b);
          }
          GameEngine.addLog(
            room,
            player.id,
            'YOINK_SUCCESS',
            `🧲 YOINK! ${player.displayName} snatched $${stolen}M in cash directly from ${targetOpponent.displayName}'s Bank!`
          );
        }
        break;
      }

      case ActionType.TOUGH_LUCK: {
        if (targetOpponent && options?.chosenCategory) {
          const cat = options.chosenCategory;
          const stolen: Card[] = [];
          targetOpponent.hand = targetOpponent.hand.filter((c) => {
            const match =
              (cat === 'MONEY' && c.type === CardType.MONEY) ||
              (cat === 'PROPERTY' && (c.type === CardType.PROPERTY || c.type === CardType.PROPERTY_WILDCARD)) ||
              (cat === 'ACTION' && c.type === CardType.ACTION);
            if (match) stolen.push(c);
            return !match;
          });
          player.hand.push(...stolen);
          GameEngine.addLog(
            room,
            player.id,
            'TOUGH_LUCK_STEAL',
            `☠️ Tough Luck! ${player.displayName} stole ALL ${cat} cards (${stolen.length} cards) directly from ${targetOpponent.displayName}'s hand into their own hand!`
          );
        }
        break;
      }
    }
  }

  /**
   * Advances a multi-target PendingAction (Rent / Birthday) to the next target,
   * or clears pendingAction if all targets are resolved.
   */
  static advancePendingActionToNextTarget(room: Room): void {
    if (!room.gameState?.pendingAction) return;
    const pending = room.gameState.pendingAction;
    if (pending.targetPlayerIds && pending.targetPlayerIds.length > 0) {
      pending.targetPlayerIds = pending.targetPlayerIds.filter((id) => id !== pending.currentAwaitingPlayerId);
      if (pending.targetPlayerIds.length > 0) {
        const nextTargetId = pending.targetPlayerIds[0];
        pending.currentAwaitingPlayerId = nextTargetId;
        pending.targetPlayerId = nextTargetId;
        const nextPlayer = room.players.find((p) => p.id === nextTargetId);
        const hasJSN = nextPlayer?.hand.some(
          (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
        );
        pending.status = hasJSN ? 'AWAITING_JSN' : 'AWAITING_PAYMENT';
        return;
      }
    }
    room.gameState.pendingAction = null;
  }

  /**
   * Proceeds action after Just Say No check has concluded.
   */
  static proceedPendingActionAfterJSN(room: Room): void {
    if (!room.gameState?.pendingAction) return;
    const pending = room.gameState.pendingAction;
    if (pending.actionType === ActionType.RENT || pending.actionType === ActionType.ITS_MY_BIRTHDAY) {
      pending.status = 'AWAITING_PAYMENT';
    } else if (pending.actionType === ActionType.REPOSSESS) {
      pending.status = 'AWAITING_REPOSSESS';
    } else {
      const attacker = room.players.find((p) => p.id === pending.attackerId);
      if (attacker) {
        GameEngine.executeDirectTargetedAction(room, attacker, pending.card, pending.options);
      }
      GameEngine.advancePendingActionToNextTarget(room);
    }
  }

  /**
   * Responds to an awaiting Just Say No prompt.
   */
  static respondJustSayNo(
    room: Room,
    responderId: string,
    actionId: string,
    accept: boolean,
    jsnCardId?: string
  ): { success: boolean; error?: string } {
    if (!room.gameState || !room.gameState.pendingAction || room.gameState.pendingAction.id !== actionId) {
      return { success: false, error: 'No active action awaiting reaction' };
    }
    const pending = room.gameState.pendingAction;
    if (pending.currentAwaitingPlayerId !== responderId) {
      return { success: false, error: 'Not your turn to respond' };
    }

    const responder = room.players.find((p) => p.id === responderId);
    if (!responder) return { success: false, error: 'Player not found' };

    if (!accept) {
      // Responder chose to play Just Say No!
      const jsnIdx = responder.hand.findIndex(
        (c) =>
          c.type === CardType.ACTION &&
          c.actionType === ActionType.JUST_SAY_NO &&
          (!jsnCardId || c.id === jsnCardId)
      );
      if (jsnIdx === -1) {
        return { success: false, error: 'You do not have a Just Say No card in hand' };
      }
      const [jsnCard] = responder.hand.splice(jsnIdx, 1);
      room.gameState.discardPile.unshift(jsnCard);
      pending.justSayNoChain.push({
        playerId: responder.id,
        playerName: responder.displayName,
        cardId: jsnCard.id,
      });

      GameEngine.addLog(
        room,
        responder.id,
        'JUST_SAY_NO_PLAYED',
        `🛑 ${responder.displayName} played JUST SAY NO to block ${pending.attackerName}'s ${pending.card.name}!`
      );

      // Check counter-possibility
      if (responderId !== pending.attackerId) {
        // Target played JSN. Can the attacker counter with their own JSN?
        const attacker = room.players.find((p) => p.id === pending.attackerId);
        const attackerHasJSN = attacker?.hand.some(
          (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
        );
        if (attackerHasJSN) {
          pending.currentAwaitingPlayerId = pending.attackerId;
          pending.status = 'AWAITING_JSN';
          return { success: true };
        }
      } else {
        // Attacker countered target's JSN. Can target counter again?
        const target = room.players.find((p) => p.id === pending.targetPlayerId);
        const targetHasJSN = target?.hand.some(
          (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
        );
        if (targetHasJSN && target) {
          pending.currentAwaitingPlayerId = target.id;
          pending.status = 'AWAITING_JSN';
          return { success: true };
        }
      }

      // No counters possible: check who won the JSN chain
      if (pending.justSayNoChain.length % 2 === 1) {
        // Action was successfully blocked!
        GameEngine.addLog(
          room,
          responder.id,
          'ACTION_CANCELLED',
          `✋ ${pending.card.name} was successfully blocked by Just Say No!`
        );
        GameEngine.advancePendingActionToNextTarget(room);
        return { success: true };
      } else {
        // Attacker countered target's block! Action proceeds
        GameEngine.proceedPendingActionAfterJSN(room);
        return { success: true };
      }
    } else {
      // Responder chose to ACCEPT (or declined to play JSN)
      if (pending.justSayNoChain.length % 2 === 1) {
        // Attacker accepted target's JSN block
        GameEngine.addLog(
          room,
          responder.id,
          'ACTION_CANCELLED',
          `✋ ${pending.card.name} was cancelled by Just Say No.`
        );
        GameEngine.advancePendingActionToNextTarget(room);
        return { success: true };
      } else {
        // Target accepted the action
        GameEngine.proceedPendingActionAfterJSN(room);
        return { success: true };
      }
    }
  }

  /**
   * Submits payment for Rent or Birthday demands (Point 6).
   */
  static submitPayment(
    room: Room,
    payerId: string,
    actionId: string,
    selectedCardIds: string[],
    surrenderDebtChip?: boolean
  ): { success: boolean; error?: string } {
    if (!room.gameState?.pendingAction || room.gameState.pendingAction.id !== actionId) {
      return { success: false, error: 'No active payment demand found' };
    }
    const pending = room.gameState.pendingAction;
    if (pending.currentAwaitingPlayerId !== payerId) {
      return { success: false, error: 'Not your turn to pay' };
    }

    const payer = room.players.find((p) => p.id === payerId);
    const creditor = room.players.find((p) => p.id === pending.attackerId);
    if (!payer || !creditor) {
      return { success: false, error: 'Player not found' };
    }

    let totalPaid = 0;

    // 1. Bank cards transfer
    selectedCardIds.forEach((id) => {
      const bIdx = payer.bank.findIndex((c) => c.id === id);
      if (bIdx !== -1) {
        const [bCard] = payer.bank.splice(bIdx, 1);
        creditor.bank.push(bCard);
        totalPaid += bCard.cashValue;
      }
    });

    // 2. Property cards transfer
    selectedCardIds.forEach((id) => {
      for (const set of payer.properties) {
        const pIdx = set.cards.findIndex((c) => c.id === id);
        if (pIdx !== -1) {
          const [pCard] = set.cards.splice(pIdx, 1);
          set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
          totalPaid += pCard.cashValue;
          GameEngine.giveCardToCreditor(creditor, pCard);
          break;
        }
      }
    });
    payer.properties = payer.properties.filter((s) => s.cards.length > 0);

    // 3. Debt Chip surrender if insolvent or indicated (Points 6 & 10)
    if (surrenderDebtChip) {
      let chipIdx = payer.debtChips.findIndex((c) => c.ownerId === payer.id);
      if (chipIdx === -1 && payer.debtChips.length > 0) chipIdx = 0;
      if (chipIdx !== -1) {
        const [chip] = payer.debtChips.splice(chipIdx, 1);
        chip.currentHolderId = creditor.id;
        chip.acquiredAt = Date.now();
        creditor.debtChips.push(chip);
        GameEngine.addLog(
          room,
          payer.id,
          'DEBT_CHIP_SURRENDER',
          `🪙 ${payer.displayName} surrendered a Debt Chip to ${creditor.displayName}!`
        );
      }
    }

    GameEngine.addLog(
      room,
      payer.id,
      'PAYMENT_SUBMITTED',
      `💰 ${payer.displayName} paid $${totalPaid}M to ${creditor.displayName} for ${pending.card.name}.`
    );

    GameEngine.checkAndBroadcastWin(room, payer);
    GameEngine.checkAndBroadcastWin(room, creditor);

    GameEngine.advancePendingActionToNextTarget(room);
    return { success: true };
  }

  /**
   * Submits repossession property distribution (Point 7).
   */
  static submitRepossess(
    room: Room,
    targetId: string,
    actionId: string,
    keepCardId: string,
    distributions: { cardId: string; targetPlayerId: string }[]
  ): { success: boolean; error?: string } {
    if (!room.gameState?.pendingAction || room.gameState.pendingAction.id !== actionId) {
      return { success: false, error: 'No active repossession found' };
    }
    const pending = room.gameState.pendingAction;
    if (pending.currentAwaitingPlayerId !== targetId) {
      return { success: false, error: 'Not your turn to repossess' };
    }

    const target = room.players.find((p) => p.id === targetId);
    if (!target) return { success: false, error: 'Player not found' };

    let keptCardName = '';
    distributions.forEach(({ cardId, targetPlayerId }) => {
      if (cardId === keepCardId) return;
      const destPlayer = room.players.find((p) => p.id === targetPlayerId);
      if (!destPlayer) return;

      for (const set of target.properties) {
        const cIdx = set.cards.findIndex((c) => c.id === cardId);
        if (cIdx !== -1) {
          const [card] = set.cards.splice(cIdx, 1);
          set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
          GameEngine.giveCardToCreditor(destPlayer, card);
          break;
        }
      }
    });
    target.properties = target.properties.filter((s) => s.cards.length > 0);

    for (const set of target.properties) {
      const k = set.cards.find((c) => c.id === keepCardId);
      if (k) keptCardName = k.name;
    }

    GameEngine.addLog(
      room,
      target.id,
      'REPOSSESSION_COMPLETE',
      `🔨 ${target.displayName} kept ${keptCardName || '1 property'} and distributed all other properties across players!`
    );

    room.players.forEach((p) => GameEngine.checkAndBroadcastWin(room, p));
    room.gameState.pendingAction = null;
    return { success: true };
  }

  /**
   * Flips a wildcard between colors.
   * Point 5: Costs 1 play (playsUsedThisTurn++).
   * Point 9: Rainbow wildcards can only be placed on/moved to colors already owned in properties!
   */
  static flipWildcard(
    room: Room,
    playerId: string,
    cardId: string,
    toColor: PropertyColor
  ): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }
    if (room.gameState.activePlayerId !== playerId) {
      return { success: false, error: 'You can only flip wildcards on your turn' };
    }
    if (room.gameState.playsUsedThisTurn >= room.gameState.maxPlaysPerTurn) {
      return { success: false, error: 'No plays remaining this turn (max 3)' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    let foundCard: Card | null = null;
    for (const set of player.properties) {
      const idx = set.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        foundCard = set.cards.splice(idx, 1)[0];
        set.isComplete = set.cards.length >= (PROPERTY_CONFIG[set.color]?.setSize || 3);
        if (set.cards.length === 0) {
          player.properties = player.properties.filter((s) => s !== set);
        }
        break;
      }
    }

    if (!foundCard) {
      return { success: false, error: 'Wildcard not found in your properties' };
    }

    // Point 9: Rainbow wildcard color restriction
    if (foundCard.isRainbow) {
      const playerHasColor = player.properties.some((s) => s.color === toColor);
      if (!playerHasColor) {
        return {
          success: false,
          error: 'Rainbow Wildcard can only be placed on a color you already own in your properties!',
        };
      }
    }

    let targetSet = player.properties.find((s) => s.color === toColor);
    if (!targetSet) {
      targetSet = { color: toColor, cards: [], house: false, hotel: false, isComplete: false };
      player.properties.push(targetSet);
    }
    targetSet.cards.push(foundCard);
    targetSet.isComplete = targetSet.cards.length >= (PROPERTY_CONFIG[toColor]?.setSize || 3);

    // Point 5: Flipping a wildcard costs 1 play!
    room.gameState.playsUsedThisTurn++;

    GameEngine.addLog(
      room,
      playerId,
      'FLIP_WILDCARD',
      `🔄 ${player.displayName} flipped wildcard ${foundCard.name} to ${PROPERTY_CONFIG[toColor]?.name || toColor} (costs 1 play).`
    );

    GameEngine.checkAndBroadcastWin(room, player);
    return { success: true };
  }

  /**
   * Settles a Debt Chip owed to an opponent according to official No Mercy rules:
   * At the start of a turn, debtor gives 1 card from hand to the creditor holding their chip.
   * Creditor receives and places it immediately. The debtor receives their Debt Chip back.
   * Settling debt does NOT count toward the 3 plays limit for the turn.
   */
  static settleDebt(
    room: Room,
    debtorId: string,
    cardId: string,
    creditorId: string
  ): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }
    const debtor = room.players.find((p) => p.id === debtorId);
    const creditor = room.players.find((p) => p.id === creditorId);
    if (!debtor || !creditor) {
      return { success: false, error: 'Player not found' };
    }

    // Find if creditor holds one of debtor's chips
    const chipIndex = creditor.debtChips.findIndex((c) => c.ownerId === debtorId);
    if (chipIndex === -1) {
      return { success: false, error: 'Creditor does not hold any of your Debt Chips' };
    }

    const cardIndex = debtor.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    const [card] = debtor.hand.splice(cardIndex, 1);
    const [chip] = creditor.debtChips.splice(chipIndex, 1);

    // Return chip to debtor
    chip.currentHolderId = debtorId;
    debtor.debtChips.push(chip);

    // Creditor places card immediately
    if (card.type === CardType.PROPERTY) {
      const color = card.color!;
      let set = creditor.properties.find((s) => s.color === color);
      if (!set) {
        set = { color, cards: [], house: false, hotel: false, isComplete: false };
        creditor.properties.push(set);
      }
      set.cards.push(card);
      set.isComplete = set.cards.length >= (PROPERTY_CONFIG[color]?.setSize || 3);
    } else if (card.type === CardType.PROPERTY_WILDCARD) {
      const color = card.colors?.[0] || PropertyColor.DARK_BLUE;
      let set = creditor.properties.find((s) => s.color === color);
      if (!set) {
        set = { color, cards: [], house: false, hotel: false, isComplete: false };
        creditor.properties.push(set);
      }
      set.cards.push(card);
      set.isComplete = set.cards.length >= (PROPERTY_CONFIG[color]?.setSize || 3);
    } else {
      // Money or Action card deposited directly into bank
      creditor.bank.push(card);
    }

    GameEngine.addLog(
      room,
      debtorId,
      'SETTLE_DEBT',
      `🤝 ${debtor.displayName} settled their debt with ${creditor.displayName} by surrendering ${card.name} and RECLAIMED their Debt Chip!`
    );

    GameEngine.checkAndBroadcastWin(room, debtor);
    GameEngine.checkAndBroadcastWin(room, creditor);

    return { success: true };
  }

  /**
   * Helper to check win condition and declare victory.
   */
  private static checkAndBroadcastWin(room: Room, player: Player): void {
    if (!room.gameState) return;
    const winResult = checkWinCondition(player, room.winMode);
    if (winResult.isWinner) {
      room.gameState.isGameOver = true;
      room.gameState.winnerId = player.id;
      room.gameState.winBreakdown = winResult;

      GameEngine.addLog(
        room,
        player.id,
        'GAME_WON',
        `🏆 ${player.displayName} HAS WON THE GAME! (${winResult.details.join(' | ')})`
      );
    }
  }

  /**
   * Ends the active player's turn and advances to next player.
   * Point 2: Player must choose which cards to discard if hand > 7 cards.
   */
  static endTurn(
    room: Room,
    playerId: string,
    discardCardIds?: string[]
  ): { success: boolean; error?: string } {
    if (!room.gameState || room.gameState.isGameOver) {
      return { success: false, error: 'Game is not active' };
    }

    if (room.gameState.activePlayerId !== playerId) {
      return { success: false, error: 'Not your turn to end' };
    }

    if (room.gameState.pendingAction) {
      return { success: false, error: 'Cannot end turn while an action is awaiting resolution' };
    }

    if (room.gameState.pendingDebtSettlement?.playerId === playerId) {
      return { success: false, error: 'Cannot end turn while debt settlement is pending' };
    }

    const currentIndex = room.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % room.players.length;
    const nextPlayer = room.players[nextIndex];

    const currentPlr = room.players[currentIndex];

    // Point 2: Enforce 7-card hand limit at end of turn of the player's own choice
    if (currentPlr.hand.length > 7) {
      const excessCount = currentPlr.hand.length - 7;
      if (!currentPlr.isBot) {
        if (!discardCardIds || discardCardIds.length !== excessCount) {
          return {
            success: false,
            error: `Hand limit is 7 cards! You have ${currentPlr.hand.length} cards and must select ${excessCount} card${excessCount > 1 ? 's' : ''} to discard.`,
          };
        }
        // Remove chosen cards from hand
        const discarded: Card[] = [];
        for (const cId of discardCardIds) {
          const idx = currentPlr.hand.findIndex((c) => c.id === cId);
          if (idx !== -1) {
            discarded.push(...currentPlr.hand.splice(idx, 1));
          }
        }
        room.gameState.discardPile.unshift(...discarded);
        GameEngine.addLog(
          room,
          playerId,
          'DISCARD_EXCESS',
          `🗑️ ${currentPlr.displayName} discarded ${discarded.length} excess card${discarded.length > 1 ? 's' : ''} of their choice to meet the 7-card hand limit.`
        );
      } else {
        // Bot automatically discards lowest-value excess cards
        const sorted = [...currentPlr.hand].sort((a, b) => a.cashValue - b.cashValue);
        const toDiscard = sorted.slice(0, excessCount);
        const toDiscardIds = new Set(toDiscard.map((c) => c.id));
        currentPlr.hand = currentPlr.hand.filter((c) => !toDiscardIds.has(c.id));
        room.gameState.discardPile.unshift(...toDiscard);
        GameEngine.addLog(
          room,
          playerId,
          'DISCARD_EXCESS',
          `🗑️ ${currentPlr.displayName} discarded ${excessCount} excess card${excessCount > 1 ? 's' : ''} to meet the 7-card hand limit.`
        );
      }
    }

    GameEngine.addLog(
      room,
      playerId,
      'END_TURN',
      `${currentPlr.displayName} ended their turn.`
    );

    room.gameState.activePlayerId = nextPlayer.id;
    room.gameState.turnNumber++;
    room.gameState.playsUsedThisTurn = 0;

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
    if (room.gameState.actionLog.length > 50) {
      room.gameState.actionLog.pop();
    }
  }
}
