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
          const recycled = shuffleDeck(discardPile.splice(0, discardPile.length));
          drawPile.push(...recycled);
          GameEngine.addLog(room, playerId, 'DRAW_PILE_RECYCLED', 'Discard pile reshuffled into draw pile.');
        } else {
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
        case ActionType.PASS_GO: {
          GameEngine.drawCards(room, playerId, 2);
          GameEngine.addLog(room, playerId, 'PLAY_PASS_GO', `${player.displayName} played Pass Go and drew 2 cards!`);
          break;
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
