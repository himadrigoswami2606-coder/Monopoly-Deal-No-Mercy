// ============================================================================
// Monopoly Deal: No Mercy — Win Condition Validator
// ============================================================================

import {
  Player,
  PublicPlayerView,
  WinMode,
  WinConditionResult,
  PropertyColor,
  PropertySet,
} from '../../shared/types';
import { PROPERTY_CONFIG } from '../../shared/deckConfig';

/**
 * Checks if a player has met the win conditions for the chosen game mode.
 *
 * Rules:
 * Mode 1 — Standard No Mercy:
 *   - >= 3 full property sets of different colors
 *   - >= $10M in Bank
 *   - All 3 of player's OWN Debt Chips held (ownedChipsHeld === 3)
 *
 * Mode 2 — Extended No Mercy:
 *   - >= 4 full property sets of different colors
 *   - >= $20M in Bank
 *   - All 3 of player's OWN Debt Chips held (ownedChipsHeld === 3)
 */
export function checkWinCondition(
  player: Player,
  winMode: WinMode
): WinConditionResult {
  const isExtended = winMode === WinMode.EXTENDED_NO_MERCY;
  const requiredSets = isExtended ? 4 : 3;
  const requiredBank = isExtended ? 20 : 10;
  const requiredChips = 3;

  // 1. Calculate complete property sets of different colors
  const completedColors: PropertyColor[] = [];

  for (const set of player.properties) {
    const config = PROPERTY_CONFIG[set.color];
    const totalCardsInSet = set.cards.length;

    // A set is complete if it has at least setSize cards
    if (config && totalCardsInSet >= config.setSize) {
      if (!completedColors.includes(set.color)) {
        completedColors.push(set.color);
      }
    }
  }

  const completeSets = completedColors.length;

  // 2. Calculate total cash value in Bank
  const bankTotal = player.bank.reduce((sum, card) => sum + (card.cashValue || 0), 0);

  // 3. Count owned chips currently held by this player
  const ownedChipsHeld = player.debtChips.filter(
    (chip) => chip.ownerId === player.id && chip.currentHolderId === player.id
  ).length;

  const setsMet = completeSets >= requiredSets;
  const bankMet = bankTotal >= requiredBank;
  const chipsMet = ownedChipsHeld >= requiredChips;

  const isWinner = setsMet && bankMet && chipsMet;

  const details: string[] = [
    `Property Sets: ${completeSets}/${requiredSets} ${setsMet ? '✓' : '✗'} (${completedColors.map((c) => PROPERTY_CONFIG[c]?.name || c).join(', ') || 'None'})`,
    `Bank Cash: $${bankTotal}M/$${requiredBank}M ${bankMet ? '✓' : '✗'}`,
    `Owned Debt Chips: ${ownedChipsHeld}/${requiredChips} ${chipsMet ? '✓' : '✗'}`,
  ];

  return {
    isWinner,
    completeSets,
    requiredSets,
    completeColors: completedColors,
    bankTotal,
    requiredBank,
    ownedChipsHeld,
    requiredChips,
    details,
  };
}

/**
 * Creates the public view of a player for opponents, hiding their private hand.
 */
export function toPublicPlayerView(player: Player): PublicPlayerView {
  const bankTotal = player.bank.reduce((sum, card) => sum + (card.cashValue || 0), 0);
  const ownedChipsHeld = player.debtChips.filter(
    (chip) => chip.ownerId === player.id && chip.currentHolderId === player.id
  ).length;

  // Ensure isComplete is updated on each property set
  const propertiesWithStatus: PropertySet[] = player.properties.map((set) => {
    const config = PROPERTY_CONFIG[set.color];
    const isComplete = config ? set.cards.length >= config.setSize : false;
    return {
      ...set,
      isComplete,
    };
  });

  const completeSetsCount = propertiesWithStatus.filter((s) => s.isComplete).length;

  return {
    id: player.id,
    displayName: player.displayName,
    socketId: player.socketId,
    isHost: player.isHost,
    isReady: player.isReady,
    colorIndex: player.colorIndex,
    bankTotal,
    bankCount: player.bank.length,
    handCount: player.hand.length,
    bankCards: player.bank,
    properties: propertiesWithStatus,
    debtChips: player.debtChips,
    ownedChipsHeld,
    completeSetsCount,
  };
}
