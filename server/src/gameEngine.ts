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

      const targetOpponent = room.players.find((p) => p.id === options?.targetPlayerId);

      // AI Bot counter: If target is a Bot and has Just Say No in hand, it automatically counters harmful action!
      if (
        targetOpponent?.isBot &&
        [
          ActionType.SLY_DEAL,
          ActionType.SUPER_SLY_DEAL,
          ActionType.FORCED_DEAL,
          ActionType.DEBT_COLLECTOR,
          ActionType.YOINK,
          ActionType.REPOSSESS,
          ActionType.TOUGH_LUCK,
        ].includes(card.actionType!)
      ) {
        const jsnIdx = targetOpponent.hand.findIndex(
          (c) => c.type === CardType.ACTION && c.actionType === ActionType.JUST_SAY_NO
        );
        if (jsnIdx !== -1) {
          const [jsnCard] = targetOpponent.hand.splice(jsnIdx, 1);
          room.gameState.discardPile.unshift(jsnCard);
          GameEngine.addLog(
            room,
            targetOpponent.id,
            'JUST_SAY_NO_COUNTER',
            `🛑 ${targetOpponent.displayName} played JUST SAY NO to block ${player.displayName}'s ${card.name}!`
          );
          room.gameState.playsUsedThisTurn++;
          return { success: true };
        }
      }

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

        case ActionType.SLY_DEAL: {
          // Steal 1 single property card from an incomplete set
          if (!targetOpponent) {
            GameEngine.addLog(room, playerId, 'SLY_DEAL_FAIL', `${player.displayName} played Sly Deal with no target.`);
            break;
          }
          let stolenCard: Card | null = null;
          for (const set of targetOpponent.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options?.targetCardId);
              if (cIdx !== -1) {
                stolenCard = set.cards.splice(cIdx, 1)[0];
                if (set.cards.length === 0) {
                  targetOpponent.properties = targetOpponent.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          if (stolenCard) {
            const color = stolenCard.color || stolenCard.colors?.[0] || PropertyColor.DARK_BLUE;
            let mySet = player.properties.find((s) => s.color === color);
            if (!mySet) {
              mySet = { color, cards: [], house: false, hotel: false, isComplete: false };
              player.properties.push(mySet);
            }
            mySet.cards.push(stolenCard);
            mySet.isComplete = mySet.cards.length >= PROPERTY_CONFIG[color].setSize;
            GameEngine.addLog(
              room,
              playerId,
              'SLY_DEAL_SUCCESS',
              `🧤 ${player.displayName} used Sly Deal to steal ${stolenCard.name} from ${targetOpponent.displayName}!`
            );
          } else {
            GameEngine.addLog(room, playerId, 'SLY_DEAL', `${player.displayName} played Sly Deal against ${targetOpponent.displayName}.`);
          }
          break;
        }

        case ActionType.SUPER_SLY_DEAL: {
          // Steal an entire complete set (including house/hotel)
          if (!targetOpponent || !options?.targetColor) {
            GameEngine.addLog(room, playerId, 'SUPER_SLY_DEAL_FAIL', `${player.displayName} played Super Sly Deal without a target set.`);
            break;
          }
          const setIndex = targetOpponent.properties.findIndex(
            (s) => s.color === options.targetColor && s.isComplete
          );
          if (setIndex !== -1) {
            const stolenSet = targetOpponent.properties.splice(setIndex, 1)[0];
            player.properties.push(stolenSet);
            GameEngine.addLog(
              room,
              playerId,
              'SUPER_SLY_DEAL_SUCCESS',
              `👑 ${player.displayName} used SUPER SLY DEAL to steal the entire complete ${PROPERTY_CONFIG[options.targetColor].name} set from ${targetOpponent.displayName}!`
            );
          }
          break;
        }

        case ActionType.FORCED_DEAL: {
          // Swap 1 property card
          if (!targetOpponent) break;
          // Find stolen card from opponent incomplete set
          let oppCard: Card | null = null;
          for (const set of targetOpponent.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options?.targetCardId);
              if (cIdx !== -1) {
                oppCard = set.cards.splice(cIdx, 1)[0];
                if (set.cards.length === 0) {
                  targetOpponent.properties = targetOpponent.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          // Find player's card to give
          let myCard: Card | null = null;
          for (const set of player.properties) {
            if (!set.isComplete) {
              const cIdx = set.cards.findIndex((c) => c.id === options?.myCardId);
              if (cIdx !== -1) {
                myCard = set.cards.splice(cIdx, 1)[0];
                if (set.cards.length === 0) {
                  player.properties = player.properties.filter((s) => s !== set);
                }
                break;
              }
            }
          }
          if (oppCard && myCard) {
            // Put oppCard into player
            const c1 = oppCard.color || oppCard.colors?.[0] || PropertyColor.DARK_BLUE;
            let s1 = player.properties.find((s) => s.color === c1);
            if (!s1) {
              s1 = { color: c1, cards: [], house: false, hotel: false, isComplete: false };
              player.properties.push(s1);
            }
            s1.cards.push(oppCard);

            // Put myCard into target
            const c2 = myCard.color || myCard.colors?.[0] || PropertyColor.DARK_BLUE;
            let s2 = targetOpponent.properties.find((s) => s.color === c2);
            if (!s2) {
              s2 = { color: c2, cards: [], house: false, hotel: false, isComplete: false };
              targetOpponent.properties.push(s2);
            }
            s2.cards.push(myCard);

            GameEngine.addLog(
              room,
              playerId,
              'FORCED_DEAL_SUCCESS',
              `🔄 ${player.displayName} forced a swap: gave ${myCard.name} to ${targetOpponent.displayName} for ${oppCard.name}!`
            );
          }
          break;
        }

        case ActionType.DEBT_COLLECTOR: {
          // Force 1 player to pay $5M
          if (targetOpponent) {
            let collected = 0;
            // Take cash from bank first
            while (targetOpponent.bank.length > 0 && collected < 5) {
              const c = targetOpponent.bank.pop()!;
              collected += c.cashValue;
              player.bank.push(c);
            }
            // If still owe, take debt chip!
            if (collected < 5 && targetOpponent.debtChips.length > 0) {
              const chip = targetOpponent.debtChips.pop()!;
              chip.currentHolderId = player.id;
              chip.acquiredAt = Date.now();
              player.debtChips.push(chip);
              GameEngine.addLog(
                room,
                playerId,
                'DEBT_CHIP_TAKEN',
                `🪙 ${targetOpponent.displayName} could not pay in full and surrendered a Debt Chip to ${player.displayName}!`
              );
            }
            GameEngine.addLog(
              room,
              playerId,
              'DEBT_COLLECTED',
              `💰 ${player.displayName} collected $${collected}M from ${targetOpponent.displayName} using Debt Collector!`
            );
          }
          break;
        }

        case ActionType.ITS_MY_BIRTHDAY: {
          // Force all other players to pay $2M each
          let totalCollected = 0;
          room.players.forEach((other) => {
            if (other.id !== playerId) {
              if (other.bank.length > 0) {
                const b = other.bank.pop()!;
                totalCollected += b.cashValue;
                player.bank.push(b);
              } else if (other.debtChips.length > 0) {
                const chip = other.debtChips.pop()!;
                chip.currentHolderId = player.id;
                chip.acquiredAt = Date.now();
                player.debtChips.push(chip);
                GameEngine.addLog(
                  room,
                  other.id,
                  'DEBT_CHIP_SURRENDER',
                  `🪙 ${other.displayName} could not pay $2M Birthday demand and surrendered a Debt Chip to ${player.displayName}!`
                );
              }
            }
          });
          GameEngine.addLog(
            room,
            playerId,
            'BIRTHDAY_CELEBRATION',
            `🎂 It's ${player.displayName}'s Birthday! Collected $${totalCollected}M from opponents!`
          );
          break;
        }

        case ActionType.YOINK: {
          // Steal up to $10M directly from 1 opponent's bank
          if (targetOpponent) {
            let stolenAmount = 0;
            while (targetOpponent.bank.length > 0 && stolenAmount < 10) {
              const b = targetOpponent.bank.pop()!;
              stolenAmount += b.cashValue;
              player.bank.push(b);
            }
            GameEngine.addLog(
              room,
              playerId,
              'YOINK_SUCCESS',
              `🧲 YOINK! ${player.displayName} snatched $${stolenAmount}M in cash directly from ${targetOpponent.displayName}'s Bank!`
            );
          }
          break;
        }

        case ActionType.TOUGH_LUCK: {
          // Opponent discards all cards of chosen category
          if (targetOpponent && options?.chosenCategory) {
            const cat = options.chosenCategory;
            const discarded: Card[] = [];
            targetOpponent.hand = targetOpponent.hand.filter((c) => {
              const match =
                (cat === 'MONEY' && c.type === CardType.MONEY) ||
                (cat === 'PROPERTY' && (c.type === CardType.PROPERTY || c.type === CardType.PROPERTY_WILDCARD)) ||
                (cat === 'ACTION' && c.type === CardType.ACTION);
              if (match) discarded.push(c);
              return !match;
            });
            room.gameState.discardPile.unshift(...discarded);
            GameEngine.addLog(
              room,
              playerId,
              'TOUGH_LUCK_HIT',
              `☠️ Tough Luck! ${targetOpponent.displayName} was forced to discard ALL ${cat} cards (${discarded.length} cards) from their hand!`
            );
          }
          break;
        }

        case ActionType.REPOSSESS: {
          // Opponent gives all properties except 1
          if (targetOpponent && targetOpponent.properties.length > 0) {
            let surrenderedCount = 0;
            // Leave first property, take all others
            while (targetOpponent.properties.length > 1) {
              const set = targetOpponent.properties.pop()!;
              player.properties.push(set);
              surrenderedCount += set.cards.length;
            }
            GameEngine.addLog(
              room,
              playerId,
              'REPOSSESSION',
              `🔨 Repossess! ${targetOpponent.displayName} was forced to surrender all property sets except 1 to ${player.displayName} (${surrenderedCount} cards)!`
            );
          }
          break;
        }

        case ActionType.RENT: {
          // Charge rent for chosen color
          const targetColor = options?.targetColor;
          if (targetColor) {
            const set = player.properties.find((s) => s.color === targetColor);
            const count = set ? set.cards.length : 0;
            let rent = PROPERTY_CONFIG[targetColor]?.rentValues?.[Math.min(count - 1, (PROPERTY_CONFIG[targetColor]?.rentValues?.length || 1) - 1)] || 1;
            if (set?.house) rent += 3;
            if (set?.hotel) rent += 4;

            // Charge target or all players
            const targets = card.isWildRent && targetOpponent ? [targetOpponent] : room.players.filter((p) => p.id !== playerId);
            let totalPaid = 0;

            targets.forEach((tgt) => {
              if (tgt.bank.length > 0) {
                const b = tgt.bank.pop()!;
                totalPaid += b.cashValue;
                player.bank.push(b);
              } else if (tgt.debtChips.length > 0) {
                // Surrender a Debt Chip if bank is empty
                const chip = tgt.debtChips.pop()!;
                chip.currentHolderId = player.id;
                chip.acquiredAt = Date.now();
                player.debtChips.push(chip);
                GameEngine.addLog(room, tgt.id, 'DEBT_CHIP_SURRENDER', `🪙 ${tgt.displayName} had no cash to pay rent and surrendered a Debt Chip to ${player.displayName}!`);
              }
            });

            GameEngine.addLog(
              room,
              playerId,
              'RENT_CHARGED',
              `📢 ${player.displayName} charged $${rent}M ${PROPERTY_CONFIG[targetColor].name} rent! Total collected: $${totalPaid}M.`
            );
          }
          break;
        }

        case ActionType.HOUSE:
        case ActionType.HOTEL: {
          const targetColor = options?.targetColor;
          const set = player.properties.find((s) => s.color === targetColor && s.isComplete);
          if (targetColor && set) {
            if (card.actionType === ActionType.HOUSE) {
              set.house = true;
              GameEngine.addLog(room, playerId, 'HOUSE_ADDED', `🏠 ${player.displayName} built a House on their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $3M rent)!`);
            } else {
              set.hotel = true;
              GameEngine.addLog(room, playerId, 'HOTEL_ADDED', `🏨 ${player.displayName} built a Hotel on their complete ${PROPERTY_CONFIG[targetColor].name} set (+ $4M rent)!`);
            }
          } else {
            // Bank as cash if no complete set
            player.bank.push(card);
            GameEngine.addLog(room, playerId, 'BANK_CARD', `${player.displayName} banked ${card.name} as $${card.cashValue}M cash.`);
          }
          break;
        }

        default: {
          // Bank any other action
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

    // Enforce 7-card hand limit at end of turn (official Monopoly Deal rules)
    if (currentPlr.hand.length > 7) {
      const excessCount = currentPlr.hand.length - 7;
      // Discard lowest priority excess cards
      const discarded = currentPlr.hand.splice(7, excessCount);
      room.gameState.discardPile.unshift(...discarded);
      GameEngine.addLog(
        room,
        playerId,
        'DISCARD_EXCESS',
        `🗑️ ${currentPlr.displayName} discarded ${excessCount} excess card${excessCount > 1 ? 's' : ''} to meet the 7-card hand limit.`
      );
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
