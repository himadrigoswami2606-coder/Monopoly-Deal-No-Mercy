// ============================================================================
// Monopoly Deal: No Mercy — Deck Configuration & Generator
// ============================================================================
// Complete 112-card deck builder with authentic Monopoly Deal: No Mercy
// action cards, rent values, cash values, and property sets.
// ============================================================================

import { Card, CardType, ActionType, PropertyColor } from './types';

// ---------------------------------------------------------------------------
//  Property Rules & Metadata
// ---------------------------------------------------------------------------

export interface PropertyColorMeta {
  name: string;
  setSize: number;
  rentValues: number[];
  cardValue: number;
  hexColor: string;
  textColor: string;
}

export const PROPERTY_CONFIG: Record<PropertyColor, PropertyColorMeta> = {
  [PropertyColor.BROWN]: {
    name: 'Brown',
    setSize: 2,
    rentValues: [1, 2],
    cardValue: 1,
    hexColor: '#8B4513',
    textColor: '#ffffff',
  },
  [PropertyColor.LIGHT_BLUE]: {
    name: 'Light Blue',
    setSize: 3,
    rentValues: [1, 2, 3],
    cardValue: 1,
    hexColor: '#87CEEB',
    textColor: '#1a1f2e',
  },
  [PropertyColor.PINK]: {
    name: 'Pink',
    setSize: 3,
    rentValues: [1, 2, 4],
    cardValue: 2,
    hexColor: '#FF69B4',
    textColor: '#1a1f2e',
  },
  [PropertyColor.ORANGE]: {
    name: 'Orange',
    setSize: 3,
    rentValues: [1, 3, 5],
    cardValue: 2,
    hexColor: '#FF8C00',
    textColor: '#ffffff',
  },
  [PropertyColor.RED]: {
    name: 'Red',
    setSize: 3,
    rentValues: [2, 3, 6],
    cardValue: 3,
    hexColor: '#DC143C',
    textColor: '#ffffff',
  },
  [PropertyColor.YELLOW]: {
    name: 'Yellow',
    setSize: 3,
    rentValues: [2, 4, 6],
    cardValue: 3,
    hexColor: '#FFD700',
    textColor: '#1a1f2e',
  },
  [PropertyColor.GREEN]: {
    name: 'Green',
    setSize: 3,
    rentValues: [2, 4, 7],
    cardValue: 4,
    hexColor: '#228B22',
    textColor: '#ffffff',
  },
  [PropertyColor.DARK_BLUE]: {
    name: 'Dark Blue',
    setSize: 2,
    rentValues: [3, 8],
    cardValue: 4,
    hexColor: '#003399',
    textColor: '#ffffff',
  },
  [PropertyColor.RAILROAD]: {
    name: 'Railroad',
    setSize: 4,
    rentValues: [1, 2, 3, 4],
    cardValue: 2,
    hexColor: '#4A4A4A',
    textColor: '#ffffff',
  },
  [PropertyColor.UTILITY]: {
    name: 'Utility',
    setSize: 2,
    rentValues: [1, 2],
    cardValue: 2,
    hexColor: '#9370DB',
    textColor: '#ffffff',
  },
};

// ---------------------------------------------------------------------------
//  Deck Generators
// ---------------------------------------------------------------------------

function createPropertyCard(
  id: string,
  name: string,
  color: PropertyColor
): Card {
  const meta = PROPERTY_CONFIG[color];
  return {
    id,
    type: CardType.PROPERTY,
    name,
    cashValue: meta.cardValue,
    color,
    setSize: meta.setSize,
    rentValues: meta.rentValues,
    description: `Standard ${meta.name} property. Set size: ${meta.setSize}.`,
  };
}

function createWildcard(
  id: string,
  name: string,
  cashValue: number,
  colors: PropertyColor[],
  isRainbow: boolean = false
): Card {
  return {
    id,
    type: CardType.PROPERTY_WILDCARD,
    name,
    cashValue,
    colors,
    isRainbow,
    description: isRainbow
      ? 'Rainbow Multi-Color Wildcard: Usable as any property color.'
      : `Dual Wildcard: Can be placed with ${colors.map((c) => PROPERTY_CONFIG[c].name).join(' or ')}.`,
  };
}

function createMoneyCard(id: string, cashValue: number): Card {
  return {
    id,
    type: CardType.MONEY,
    name: `$${cashValue}M`,
    cashValue,
    description: `Bank card worth $${cashValue}M cash.`,
  };
}

function createActionCard(
  id: string,
  name: string,
  actionType: ActionType,
  cashValue: number,
  description: string,
  extras?: Partial<Card>
): Card {
  return {
    id,
    type: CardType.ACTION,
    name,
    actionType,
    cashValue,
    description,
    ...extras,
  };
}

// ---------------------------------------------------------------------------
//  Complete Deck Builder
// ---------------------------------------------------------------------------

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // ==========================================
  // 1. PROPERTY CARDS (28 total)
  // ==========================================

  // Brown (2) — $1M
  deck.push(createPropertyCard('prop-brown-1', 'Baltic Avenue', PropertyColor.BROWN));
  deck.push(createPropertyCard('prop-brown-2', 'Mediterranean Avenue', PropertyColor.BROWN));

  // Light Blue (3) — $1M
  deck.push(createPropertyCard('prop-lightblue-1', 'Oriental Avenue', PropertyColor.LIGHT_BLUE));
  deck.push(createPropertyCard('prop-lightblue-2', 'Vermont Avenue', PropertyColor.LIGHT_BLUE));
  deck.push(createPropertyCard('prop-lightblue-3', 'Connecticut Avenue', PropertyColor.LIGHT_BLUE));

  // Pink (3) — $2M
  deck.push(createPropertyCard('prop-pink-1', 'St. Charles Place', PropertyColor.PINK));
  deck.push(createPropertyCard('prop-pink-2', 'States Avenue', PropertyColor.PINK));
  deck.push(createPropertyCard('prop-pink-3', 'Virginia Avenue', PropertyColor.PINK));

  // Orange (3) — $2M
  deck.push(createPropertyCard('prop-orange-1', 'St. James Place', PropertyColor.ORANGE));
  deck.push(createPropertyCard('prop-orange-2', 'Tennessee Avenue', PropertyColor.ORANGE));
  deck.push(createPropertyCard('prop-orange-3', 'New York Avenue', PropertyColor.ORANGE));

  // Red (3) — $3M
  deck.push(createPropertyCard('prop-red-1', 'Kentucky Avenue', PropertyColor.RED));
  deck.push(createPropertyCard('prop-red-2', 'Indiana Avenue', PropertyColor.RED));
  deck.push(createPropertyCard('prop-red-3', 'Illinois Avenue', PropertyColor.RED));

  // Yellow (3) — $3M
  deck.push(createPropertyCard('prop-yellow-1', 'Atlantic Avenue', PropertyColor.YELLOW));
  deck.push(createPropertyCard('prop-yellow-2', 'Ventnor Avenue', PropertyColor.YELLOW));
  deck.push(createPropertyCard('prop-yellow-3', 'Marvin Gardens', PropertyColor.YELLOW));

  // Green (3) — $4M
  deck.push(createPropertyCard('prop-green-1', 'Pacific Avenue', PropertyColor.GREEN));
  deck.push(createPropertyCard('prop-green-2', 'North Carolina Avenue', PropertyColor.GREEN));
  deck.push(createPropertyCard('prop-green-3', 'Pennsylvania Avenue', PropertyColor.GREEN));

  // Dark Blue (2) — $4M
  deck.push(createPropertyCard('prop-darkblue-1', 'Park Place', PropertyColor.DARK_BLUE));
  deck.push(createPropertyCard('prop-darkblue-2', 'Boardwalk', PropertyColor.DARK_BLUE));

  // Railroad (4) — $2M
  deck.push(createPropertyCard('prop-railroad-1', 'Reading Railroad', PropertyColor.RAILROAD));
  deck.push(createPropertyCard('prop-railroad-2', 'Pennsylvania Railroad', PropertyColor.RAILROAD));
  deck.push(createPropertyCard('prop-railroad-3', 'B. & O. Railroad', PropertyColor.RAILROAD));
  deck.push(createPropertyCard('prop-railroad-4', 'Short Line', PropertyColor.RAILROAD));

  // Utility (2) — $2M
  deck.push(createPropertyCard('prop-utility-1', 'Electric Company', PropertyColor.UTILITY));
  deck.push(createPropertyCard('prop-utility-2', 'Water Works', PropertyColor.UTILITY));

  // ==========================================
  // 2. PROPERTY WILDCARDS (11 total)
  // ==========================================

  // Dark Blue / Green (1, $4M)
  deck.push(createWildcard('wild-db-green-1', 'Dark Blue / Green Wildcard', 4, [
    PropertyColor.DARK_BLUE,
    PropertyColor.GREEN,
  ]));

  // Green / Railroad (1, $4M)
  deck.push(createWildcard('wild-green-rr-1', 'Green / Railroad Wildcard', 4, [
    PropertyColor.GREEN,
    PropertyColor.RAILROAD,
  ]));

  // Utility / Railroad (1, $2M)
  deck.push(createWildcard('wild-util-rr-1', 'Utility / Railroad Wildcard', 2, [
    PropertyColor.UTILITY,
    PropertyColor.RAILROAD,
  ]));

  // Light Blue / Railroad (1, $1M)
  deck.push(createWildcard('wild-lb-rr-1', 'Light Blue / Railroad Wildcard', 1, [
    PropertyColor.LIGHT_BLUE,
    PropertyColor.RAILROAD,
  ]));

  // Light Blue / Brown (1, $1M)
  deck.push(createWildcard('wild-lb-brown-1', 'Light Blue / Brown Wildcard', 1, [
    PropertyColor.LIGHT_BLUE,
    PropertyColor.BROWN,
  ]));

  // Pink / Orange (2, $2M)
  deck.push(createWildcard('wild-pink-orange-1', 'Pink / Orange Wildcard', 2, [
    PropertyColor.PINK,
    PropertyColor.ORANGE,
  ]));
  deck.push(createWildcard('wild-pink-orange-2', 'Pink / Orange Wildcard', 2, [
    PropertyColor.PINK,
    PropertyColor.ORANGE,
  ]));

  // Red / Yellow (2, $3M)
  deck.push(createWildcard('wild-red-yellow-1', 'Red / Yellow Wildcard', 3, [
    PropertyColor.RED,
    PropertyColor.YELLOW,
  ]));
  deck.push(createWildcard('wild-red-yellow-2', 'Red / Yellow Wildcard', 3, [
    PropertyColor.RED,
    PropertyColor.YELLOW,
  ]));

  // Rainbow Multi-Color Wildcard (2, $0M)
  const allColors: PropertyColor[] = [
    PropertyColor.BROWN,
    PropertyColor.LIGHT_BLUE,
    PropertyColor.PINK,
    PropertyColor.ORANGE,
    PropertyColor.RED,
    PropertyColor.YELLOW,
    PropertyColor.GREEN,
    PropertyColor.DARK_BLUE,
    PropertyColor.RAILROAD,
    PropertyColor.UTILITY,
  ];
  deck.push(createWildcard('wild-rainbow-1', 'Rainbow Wildcard', 0, allColors, true));
  deck.push(createWildcard('wild-rainbow-2', 'Rainbow Wildcard', 0, allColors, true));

  // ==========================================
  // 3. MONEY CARDS (20 total)
  // ==========================================

  // $1M (x6)
  for (let i = 1; i <= 6; i++) {
    deck.push(createMoneyCard(`money-1m-${i}`, 1));
  }
  // $2M (x5)
  for (let i = 1; i <= 5; i++) {
    deck.push(createMoneyCard(`money-2m-${i}`, 2));
  }
  // $3M (x3)
  for (let i = 1; i <= 3; i++) {
    deck.push(createMoneyCard(`money-3m-${i}`, 3));
  }
  // $4M (x3)
  for (let i = 1; i <= 3; i++) {
    deck.push(createMoneyCard(`money-4m-${i}`, 4));
  }
  // $5M (x2)
  for (let i = 1; i <= 2; i++) {
    deck.push(createMoneyCard(`money-5m-${i}`, 5));
  }
  // $10M (x1)
  deck.push(createMoneyCard('money-10m-1', 10));

  // ==========================================
  // 4. ACTION & BUILDING CARDS (53 total)
  // ==========================================

  // Pass Go (x10, $1M) — Draw 2 cards
  for (let i = 1; i <= 10; i++) {
    deck.push(
      createActionCard(
        `action-passgo-${i}`,
        'Pass Go',
        ActionType.PASS_GO,
        1,
        'Draw 2 extra cards from the draw pile.'
      )
    );
  }

  // Double the Rent (x2, $1M) — Doubles rent charged
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-doublerent-${i}`,
        'Double the Rent',
        ActionType.DOUBLE_THE_RENT,
        1,
        'Doubles the rent charged with a Rent card. Stackable!'
      )
    );
  }

  // Dual-Color Rent Cards (x10 total, $1M each affecting all players)
  const rentPairs: [PropertyColor, PropertyColor, string][] = [
    [PropertyColor.BROWN, PropertyColor.LIGHT_BLUE, 'Brown / Light Blue'],
    [PropertyColor.PINK, PropertyColor.ORANGE, 'Pink / Orange'],
    [PropertyColor.RED, PropertyColor.YELLOW, 'Red / Yellow'],
    [PropertyColor.GREEN, PropertyColor.DARK_BLUE, 'Green / Dark Blue'],
    [PropertyColor.RAILROAD, PropertyColor.UTILITY, 'Railroad / Utility'],
  ];

  rentPairs.forEach(([c1, c2, label]) => {
    for (let i = 1; i <= 2; i++) {
      const code = `${c1.toLowerCase()}-${c2.toLowerCase()}`;
      deck.push(
        createActionCard(
          `action-rent-${code}-${i}`,
          `${label} Rent`,
          ActionType.RENT,
          1,
          `All players pay you rent for properties you own in ${label}.`,
          { rentColors: [c1, c2] }
        )
      );
    }
  });

  // Wild Multi-Color Rent (x3 total, $3M each affecting 1 chosen player)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-rent-wild-${i}`,
        'Wild Rent',
        ActionType.RENT,
        3,
        'Charge 1 chosen player rent for any property color you own.',
        { isWildRent: true, rentColors: allColors }
      )
    );
  }

  // House (x3, $3M) — +$3M rent to complete set
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-house-${i}`,
        'House',
        ActionType.HOUSE,
        3,
        'Adds +$3M rent to any complete property set (except Railroads & Utilities).'
      )
    );
  }

  // Hotel (x2, $4M) — +$4M rent to complete set with House
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-hotel-${i}`,
        'Hotel',
        ActionType.HOTEL,
        4,
        'Adds +$4M rent to any complete property set that already has a House.'
      )
    );
  }

  // Just Say No (x3, $4M) — Cancels any action played against you
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-justsayno-${i}`,
        'Just Say No',
        ActionType.JUST_SAY_NO,
        4,
        'Cancels any action card played against you! Can be countered by another Just Say No.'
      )
    );
  }

  // Super Sly Deal (x2, $3M) — Steal a complete property set
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-superslydeal-${i}`,
        'Super Sly Deal',
        ActionType.SUPER_SLY_DEAL,
        3,
        'Steal an entire complete property set (including attached Houses/Hotels) from an opponent!'
      )
    );
  }

  // Sly Deal (x3, $3M) — Steal 1 single property card
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-slydeal-${i}`,
        'Sly Deal',
        ActionType.SLY_DEAL,
        3,
        'Steal 1 single property card from an opponent (cannot be from a complete set).'
      )
    );
  }

  // Forced Deal (x3, $3M) — Swap 1 of your properties with 1 opponent property
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-forceddeal-${i}`,
        'Forced Deal',
        ActionType.FORCED_DEAL,
        3,
        'Swap 1 of your property cards with 1 opponent property card (neither can be from a complete set).'
      )
    );
  }

  // Debt Collector (x3, $3M) — Force 1 player to pay you $5M
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-debtcollector-${i}`,
        'Debt Collector',
        ActionType.DEBT_COLLECTOR,
        3,
        'Force 1 player to pay you $5M in cash or properties.'
      )
    );
  }

  // It's My Birthday (x3, $2M) — Force all other players to pay you $2M each
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-birthday-${i}`,
        "It's My Birthday",
        ActionType.ITS_MY_BIRTHDAY,
        2,
        'All other players must pay you $2M each in cash or properties.'
      )
    );
  }

  // Yoink! (x2, $2M) — Steal up to $10M in cash directly from 1 opponent's Bank
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-yoink-${i}`,
        'Yoink!',
        ActionType.YOINK,
        2,
        "Steal up to $10M in cash directly from 1 opponent's Bank!"
      )
    );
  }

  // Repossess (x2, $4M) — Force 1 opponent to give you all properties except 1
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-repossess-${i}`,
        'Repossess',
        ActionType.REPOSSESS,
        4,
        'Force 1 opponent to surrender ALL of their properties to you, except 1 of their choice!'
      )
    );
  }

  // Tough Luck (x2, $3M) — Choose 1 opponent and a category; discard all cards of that type from hand
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-toughluck-${i}`,
        'Tough Luck',
        ActionType.TOUGH_LUCK,
        3,
        'Choose 1 opponent and a category (Money, Property, or Action). They must discard all cards of that type from their hand!'
      )
    );
  }

  return deck;
}

// ---------------------------------------------------------------------------
//  Deck Utilities
// ---------------------------------------------------------------------------

/** Fisher-Yates (Knuth) shuffle algorithm — returns a fresh shuffled array. */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Total card count in a fresh deck (112 cards). */
export const DECK_SIZE = 112;
