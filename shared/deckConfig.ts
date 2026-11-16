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
  // 3. MONEY CARDS (18 total - High bills: $15M, $10M + 16 smaller bills)
  // ==========================================
  deck.push(createMoneyCard('money-15m-1', 15)); // $15M (x1) - Highest bill in No Mercy
  deck.push(createMoneyCard('money-10m-1', 10)); // $10M (x1)

  // $5M (x2)
  for (let i = 1; i <= 2; i++) deck.push(createMoneyCard(`money-5m-${i}`, 5));
  // $4M (x2)
  for (let i = 1; i <= 2; i++) deck.push(createMoneyCard(`money-4m-${i}`, 4));
  // $3M (x3)
  for (let i = 1; i <= 3; i++) deck.push(createMoneyCard(`money-3m-${i}`, 3));
  // $2M (x4)
  for (let i = 1; i <= 4; i++) deck.push(createMoneyCard(`money-2m-${i}`, 2));
  // $1M (x5)
  for (let i = 1; i <= 5; i++) deck.push(createMoneyCard(`money-1m-${i}`, 1));

  // ==========================================
  // 4. RENT & DOUBLE RENT CARDS (16 total)
  // ==========================================
  const rentPairs: [PropertyColor, PropertyColor, string][] = [
    [PropertyColor.BROWN, PropertyColor.LIGHT_BLUE, 'Brown / Light Blue'],
    [PropertyColor.PINK, PropertyColor.ORANGE, 'Pink / Orange'],
    [PropertyColor.RED, PropertyColor.YELLOW, 'Red / Yellow'],
    [PropertyColor.GREEN, PropertyColor.DARK_BLUE, 'Green / Dark Blue'],
    [PropertyColor.RAILROAD, PropertyColor.UTILITY, 'Railroad / Utility'],
  ];

  // 4A. 5 Dual-Color Rent Cards (1x each pair, $1M cash value)
  rentPairs.forEach(([c1, c2, label]) => {
    const code = `${c1.toLowerCase()}-${c2.toLowerCase()}`;
    deck.push(
      createActionCard(
        `action-rent-${code}`,
        `${label} Rent`,
        ActionType.RENT,
        1,
        `All players pay you rent for properties you own in ${label}.`,
        { rentColors: [c1, c2] }
      )
    );
  });

  // 4B. 5 Dual-Color Double Rent Cards (1x each pair, $1M cash value, charges 2x rent)
  rentPairs.forEach(([c1, c2, label]) => {
    const code = `${c1.toLowerCase()}-${c2.toLowerCase()}`;
    deck.push(
      createActionCard(
        `action-doublerent-${code}`,
        `${label} Double Rent`,
        ActionType.DOUBLE_THE_RENT,
        1,
        `All players pay you DOUBLE rent for properties you own in ${label}.`,
        { rentColors: [c1, c2] }
      )
    );
  });

  // 4C. 3 Rent Any Color (Wild Rent, $3M cash value, targets 1 player)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-rent-wild-${i}`,
        'Rent Any Color',
        ActionType.RENT,
        3,
        'Charge 1 chosen player rent for any property color you own.',
        { isWildRent: true, rentColors: allColors }
      )
    );
  }

  // 4D. 3 Double Rent Any Color (Wild Double Rent, $3M cash value, targets 1 player for 2x rent)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-doublerent-wild-${i}`,
        'Double Rent Any Color',
        ActionType.DOUBLE_THE_RENT,
        3,
        'Charge 1 chosen player DOUBLE rent for any property color you own.',
        { isWildRent: true, rentColors: allColors }
      )
    );
  }

  // ==========================================
  // 5. ACTION CARDS (42 total)
  // ==========================================

  // 3 Deal Breaker ($3M) - Steal 1 complete set from any player (including attached Shack)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-dealbreaker-${i}`,
        'Deal Breaker',
        ActionType.DEAL_BREAKER,
        3,
        'Steal 1 complete property set from any player (including any attached Shack)!'
      )
    );
  }

  // 3 Forced Debt ($3M) - Take 1 Debt Chip from chosen player
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-forceddebt-${i}`,
        'Forced Debt',
        ActionType.FORCED_DEBT,
        3,
        'Choose 1 player and immediately take 1 of their Debt Chips!'
      )
    );
  }

  // 3 Go Again ($2M) - Draw 2 cards and take another full turn
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-goagain-${i}`,
        'Go Again',
        ActionType.GO_AGAIN,
        2,
        'Draw 2 fresh cards and take another full turn with 3 fresh plays!'
      )
    );
  }

  // 3 Heist ($3M) - Steal any 1 card from every other player's Bank
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-heist-${i}`,
        'Heist',
        ActionType.HEIST,
        3,
        "Choose and steal any 1 card from every other player's Bank directly into your own Bank! (Empty banks give nothing and do not owe debt chips)"
      )
    );
  }

  // 5 Just Say No ($4M) - Cancel any action played against you
  for (let i = 1; i <= 5; i++) {
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

  // 3 Market Crash ($4M) - Steal 1 property card from every other player (including from complete sets)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-marketcrash-${i}`,
        'Market Crash',
        ActionType.MARKET_CRASH,
        4,
        "Choose and steal 1 property from every other player's collection on the table, even from complete sets! (Any attached Shack moves with the stolen property)"
      )
    );
  }

  // 4 Pass Go, Go Go! ($1M) - Draw until you hold 7 cards in hand
  for (let i = 1; i <= 4; i++) {
    deck.push(
      createActionCard(
        `action-passgogogo-${i}`,
        'Pass Go, Go Go!',
        ActionType.PASS_GO_GO_GO,
        1,
        'Draw cards from the draw pile until you hold 7 cards in your hand!'
      )
    );
  }

  // 2 Repossession ($4M) - Target 1 player: keeps 1 property, gives rest to other players
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-repossess-${i}`,
        'Repossession',
        ActionType.REPOSSESS,
        4,
        'Force 1 player to keep only 1 property card, and distribute all their other properties to the rest of the players!'
      )
    );
  }

  // 3 Shack ($3M) - Place on any property for +$3M rent (costs 1 play to place or move)
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-shack-${i}`,
        'Shack',
        ActionType.SHACK,
        3,
        'Place on any property in your collection for +$3M rent! Can be moved to another property for 1 play.'
      )
    );
  }

  // 3 Super Sly Deal ($3M) - Steal all properties of 1 color from every opponent
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-superslydeal-${i}`,
        'Super Sly Deal',
        ActionType.SUPER_SLY_DEAL,
        3,
        'Choose a color and steal ALL properties of that color from every opponent (including complete sets)!'
      )
    );
  }

  // 2 Tax Collector ($3M) - Target 1 player: keeps 1 bank card, gives rest to other players
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-taxcollector-${i}`,
        'Tax Collector',
        ActionType.TAX_COLLECTOR,
        3,
        'Force 1 player to keep only 1 card in their Bank, and distribute all their other bank cards to the rest of the players!'
      )
    );
  }

  // 3 Tough Luck ($2M) - Target 1 player & category: they give you all cards of that category from hand
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-toughluck-${i}`,
        'Tough Luck',
        ActionType.TOUGH_LUCK,
        2,
        'Choose 1 opponent and a card type (Money, Property, or Action). They must give you all cards of that type from their hand!'
      )
    );
  }

  // 2 Unfair Trade ($4M) - Swap your entire bank with an opponent's bank
  for (let i = 1; i <= 2; i++) {
    deck.push(
      createActionCard(
        `action-unfairtrade-${i}`,
        'Unfair Trade',
        ActionType.UNFAIR_TRADE,
        4,
        "Swap your entire Bank with 1 opponent's Bank! (Your Bank must have at least 1 card to play this card)"
      )
    );
  }

  // 3 Yoink! ($2M) - Demand $10M cash from chosen player
  for (let i = 1; i <= 3; i++) {
    deck.push(
      createActionCard(
        `action-yoink-${i}`,
        'Yoink!',
        ActionType.YOINK,
        2,
        "Demand $10M from 1 chosen player! (If they can't pay in full, they pay what they can and give you a Debt Chip)"
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

/** Total card count in a fresh deck (115 cards). */
export const DECK_SIZE = 115;
