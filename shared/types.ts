// ============================================================================
// Monopoly Deal: No Mercy — Shared Types
// ============================================================================
// All enums, interfaces, and socket event constants shared between the
// server and client. Single source of truth.
// ============================================================================

// ---------------------------------------------------------------------------
//  Enums
// ---------------------------------------------------------------------------

/** Broad classification of every card in the deck. */
export enum CardType {
  PROPERTY          = 'PROPERTY',
  PROPERTY_WILDCARD = 'PROPERTY_WILDCARD',
  MONEY             = 'MONEY',
  ACTION            = 'ACTION',
}

/** Every distinct action card available in the No Mercy expansion. */
export enum ActionType {
  PASS_GO          = 'PASS_GO',
  PASS_GO_GO_GO    = 'PASS_GO_GO_GO',
  GO_AGAIN         = 'GO_AGAIN',
  DOUBLE_THE_RENT  = 'DOUBLE_THE_RENT',
  RENT             = 'RENT',
  SHACK            = 'SHACK',
  HOUSE            = 'HOUSE',
  HOTEL            = 'HOTEL',
  JUST_SAY_NO      = 'JUST_SAY_NO',
  SUPER_SLY_DEAL   = 'SUPER_SLY_DEAL',
  SLY_DEAL         = 'SLY_DEAL',
  FORCED_DEAL      = 'FORCED_DEAL',
  FORCED_DEBT      = 'FORCED_DEBT',
  DEBT_COLLECTOR   = 'FORCED_DEBT', // backward compatible alias
  ITS_MY_BIRTHDAY  = 'ITS_MY_BIRTHDAY',
  YOINK            = 'YOINK',
  REPOSSESS        = 'REPOSSESS',
  TOUGH_LUCK       = 'TOUGH_LUCK',
}

/** The ten property colors (including Railroad and Utility). */
export enum PropertyColor {
  BROWN      = 'BROWN',
  LIGHT_BLUE = 'LIGHT_BLUE',
  PINK       = 'PINK',
  ORANGE     = 'ORANGE',
  RED        = 'RED',
  YELLOW     = 'YELLOW',
  GREEN      = 'GREEN',
  DARK_BLUE  = 'DARK_BLUE',
  RAILROAD   = 'RAILROAD',
  UTILITY    = 'UTILITY',
}

/**
 * Victory conditions:
 * - STANDARD_NO_MERCY — 3 complete property sets of different colors + at least $10M in Bank + all 3 of your Debt Chips
 * - EXTENDED_NO_MERCY — 4 complete property sets of different colors + at least $20M in Bank + all 3 of your Debt Chips
 */
export enum WinMode {
  STANDARD_NO_MERCY = 'STANDARD_NO_MERCY',
  EXTENDED_NO_MERCY = 'EXTENDED_NO_MERCY',
}

// ---------------------------------------------------------------------------
//  Card & Debt Chip
// ---------------------------------------------------------------------------

/** A single card in the deck, hand, bank, or property set. */
export interface Card {
  /** Unique identifier for this card instance. */
  id: string;

  /** Broad type bucket. */
  type: CardType;

  /** Human-readable card name (e.g. "Boardwalk", "Pass Go", "$5M"). */
  name: string;

  /** Cash / bank value of the card (in millions, e.g. 3 = $3M). */
  cashValue: number;

  /** Fixed color for standard property cards. */
  color?: PropertyColor;

  /** Available colors for property wildcard cards. */
  colors?: PropertyColor[];

  /** Whether this is a rainbow (multi-color) wildcard. */
  isRainbow?: boolean;

  /** Specific action this card performs (only when `type === ACTION`). */
  actionType?: ActionType;

  /** Rent values indexed by set size minus one. */
  rentValues?: number[];

  /** Number of cards required to complete the set for this card's color. */
  setSize?: number;

  /** Dual colors for rent card. */
  rentColors?: PropertyColor[];

  /** Whether this is a wild multi-color rent card (affects 1 chosen player). */
  isWildRent?: boolean;

  /** Brief description of what the action does. */
  description?: string;
}

/** A debt chip tracking owner and current holder. */
export interface DebtChip {
  /** Unique chip identifier. */
  id: string;

  /** Player who originally owned / issued the chip. */
  ownerId: string;

  /** Player currently holding (owing) the chip. */
  currentHolderId: string;

  /** Timestamp when the chip was acquired by current holder (for FIFO priority). */
  acquiredAt?: number;
}

// ---------------------------------------------------------------------------
//  Property Set
// ---------------------------------------------------------------------------

/** A group of property cards of the same color on the table. */
export interface PropertySet {
  /** The color this set belongs to. */
  color: PropertyColor;

  /** Cards placed in the set (properties + wildcards). */
  cards: Card[];

  /** Whether a Shack has been added to this set (No Mercy official rule). */
  shack?: boolean;

  /** Whether a House has been added to this set. */
  house: boolean;

  /** Whether a Hotel has been added to this set (requires a House first). */
  hotel: boolean;

  /** Whether the set has enough cards to be considered complete. */
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
//  Player & Views
// ---------------------------------------------------------------------------

/** Full player state — private hand is visible only to the owning client and server. */
export interface Player {
  /** Unique player identifier. */
  id: string;

  /** Chosen display name. */
  displayName: string;

  /** Current Socket.IO connection id. */
  socketId: string;

  /** Whether this player is the room host. */
  isHost: boolean;

  /** Whether this player has toggled "ready" in the lobby. */
  isReady: boolean;

  /** Index into a shared palette so every player gets a distinct color (0 to 5). */
  colorIndex: number;

  /** Whether this player is an AI bot. */
  isBot?: boolean;

  /** Cards currently in hand (hidden from opponents). */
  hand: Card[];

  /** Cards placed in the bank. */
  bank: Card[];

  /** Property sets on the table. */
  properties: PropertySet[];

  /** Debt chips this player holds. */
  debtChips: DebtChip[];
}

/**
 * Public summary of a player sent to opponents (hiding private cards in hand).
 */
export interface PublicPlayerView {
  id: string;
  displayName: string;
  socketId: string;
  isHost: boolean;
  isReady: boolean;
  colorIndex: number;
  isBot?: boolean;

  /** Total cash value currently stored in player's bank ($M). */
  bankTotal: number;

  /** Number of cards in player's bank. */
  bankCount: number;

  /** Number of cards in player's hand (hand contents are hidden). */
  handCount: number;

  /** Bank cards (can be public or count-only; public view includes cards in bank). */
  bankCards: Card[];

  /** Property sets on the table (always public). */
  properties: PropertySet[];

  /** Debt chips currently held by this player. */
  debtChips: DebtChip[];

  /** Number of owned chips still held by this player (starts at 3). */
  ownedChipsHeld: number;

  /** Number of complete property sets. */
  completeSetsCount: number;
}

// ---------------------------------------------------------------------------
//  Action Log
// ---------------------------------------------------------------------------

/** A single entry in the game's running action log. */
export interface ActionLogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  action: string;
  details: string;
}

// ---------------------------------------------------------------------------
//  Game State
// ---------------------------------------------------------------------------

export interface PendingDebtSettlement {
  playerId: string;
  drawnCards: Card[];
  creditorIds: string[]; // prioritized by acquiredAt
}

export type PendingActionStatus = 'AWAITING_JSN' | 'AWAITING_PAYMENT' | 'AWAITING_REPOSSESS';

/** Targeted action requiring real-time response from opponent(s) */
export interface PendingAction {
  id: string;
  attackerId: string;
  attackerName: string;
  card: Card;
  actionType: ActionType;
  targetPlayerId?: string; // primary target
  targetPlayerIds?: string[]; // for multi-player demands (Dual Rent / Birthday)
  currentAwaitingPlayerId: string;
  options?: any;
  rentAmount?: number;
  rentColor?: PropertyColor;
  isDoubleRent?: boolean;
  amountDue?: number;
  demandDescription?: string;
  justSayNoChain: { playerId: string; playerName: string; cardId: string }[];
  status: PendingActionStatus;
  createdAt: number;
}

/** The authoritative state of an in-progress game. */
export interface GameState {
  /** ID of the player whose turn it currently is. */
  activePlayerId: string;

  /** Current turn number (starts at 1). */
  turnNumber: number;

  /** How many card plays the active player has used this turn (0 to 3). */
  playsUsedThisTurn: number;

  /** Maximum card plays allowed per turn (3). */
  maxPlaysPerTurn: number;

  /** Cards remaining in the face-down draw pile. */
  drawPileCount: number;

  /** Top cards of the face-up discard pile. */
  discardPile: Card[];

  /** Chronological log of actions. */
  actionLog: ActionLogEntry[];

  /** Whether the game has ended. */
  isGameOver: boolean;

  /** ID of winning player or null. */
  winnerId: string | null;

  /** Detailed breakdown of the win condition when won. */
  winBreakdown: WinConditionResult | null;

  /** Staged drawn cards for debt settlement at turn start (Point 5). */
  pendingDebtSettlement?: PendingDebtSettlement | null;

  /** Real-time reaction action (Just Say No, Rent payment, Repossess). */
  pendingAction?: PendingAction | null;
}

// ---------------------------------------------------------------------------
//  Win Condition Breakdown
// ---------------------------------------------------------------------------

export interface WinConditionResult {
  isWinner: boolean;
  completeSets: number;
  requiredSets: number;
  completeColors: PropertyColor[];
  bankTotal: number;
  requiredBank: number;
  ownedChipsHeld: number;
  requiredChips: number;
  details: string[];
}

// ---------------------------------------------------------------------------
//  Room
// ---------------------------------------------------------------------------

/** A lobby / game room. */
export interface Room {
  id: string;
  code: string;
  hostId: string;
  winMode: WinMode;
  players: Player[];
  gameState: GameState | null;
  maxPlayers: number;
  minPlayers: number;
}

// ---------------------------------------------------------------------------
//  Socket.IO Events & Payloads
// ---------------------------------------------------------------------------

export const EVENT_CREATE_ROOM      = 'create-room'      as const;
export const EVENT_JOIN_ROOM        = 'join-room'        as const;
export const EVENT_TOGGLE_READY     = 'toggle-ready'     as const;
export const EVENT_SET_WIN_MODE     = 'set-win-mode'     as const;
export const EVENT_START_GAME       = 'start-game'       as const;
export const EVENT_PLAY_CARD        = 'play-card'        as const;
export const EVENT_END_TURN         = 'end-turn'         as const;
export const EVENT_DRAW_CARDS       = 'draw-cards'       as const;
export const EVENT_LEAVE_ROOM       = 'leave-room'       as const;
export const EVENT_SEND_EMOTE       = 'send-emote'       as const;
export const EVENT_ADD_BOT          = 'add-bot'          as const;
export const EVENT_REMOVE_BOT       = 'remove-bot'       as const;
export const EVENT_FLIP_WILDCARD    = 'flip-wildcard'    as const;
export const EVENT_SETTLE_DEBT      = 'settle-debt'      as const;
export const EVENT_RESOLVE_DEBT_DRAW= 'resolve-debt-draw'as const;
export const EVENT_RESPOND_JUST_SAY_NO = 'respond-just-say-no' as const;
export const EVENT_SUBMIT_PAYMENT   = 'submit-payment'   as const;
export const EVENT_SUBMIT_REPOSSESS = 'submit-repossess' as const;
export const EVENT_MOVE_SHACK       = 'move-shack'       as const;

export const EVENT_ROOM_CREATED     = 'room-created'     as const;
export const EVENT_ROOM_JOINED      = 'room-joined'      as const;
export const EVENT_ROOM_UPDATED     = 'room-updated'     as const;
export const EVENT_GAME_STARTED     = 'game-started'     as const;
export const EVENT_GAME_STATE_UPDATE= 'game-state-update'as const;
export const EVENT_GAME_OVER        = 'game-over'        as const;
export const EVENT_ERROR            = 'error'            as const;
export const EVENT_HOST_CHANGED     = 'host-changed'     as const;
export const EVENT_EMOTE_RECEIVED   = 'emote-received'   as const;

export interface ClientToServerEvents {
  [EVENT_CREATE_ROOM]: (data: { displayName: string }) => void;
  [EVENT_JOIN_ROOM]: (data: { code: string; displayName: string }) => void;
  [EVENT_TOGGLE_READY]: () => void;
  [EVENT_SET_WIN_MODE]: (data: { winMode: WinMode }) => void;
  [EVENT_START_GAME]: () => void;
  [EVENT_PLAY_CARD]: (data: {
    cardId: string;
    targetColor?: PropertyColor;
    targetPlayerId?: string;
    targetCardId?: string;
    myCardId?: string;
    chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
    asBank?: boolean;
  }) => void;
  [EVENT_END_TURN]: (data?: { discardCardIds?: string[] }) => void;
  [EVENT_DRAW_CARDS]: () => void;
  [EVENT_LEAVE_ROOM]: () => void;
  [EVENT_SEND_EMOTE]: (data: { emote: string }) => void;
  [EVENT_ADD_BOT]: () => void;
  [EVENT_REMOVE_BOT]: (data: { botId: string }) => void;
  [EVENT_FLIP_WILDCARD]: (data: { cardId: string; toColor: PropertyColor }) => void;
  [EVENT_SETTLE_DEBT]: (data: { cardId: string; creditorId: string }) => void;
  [EVENT_RESOLVE_DEBT_DRAW]: (data: { chosenCardId: string }) => void;
  [EVENT_RESPOND_JUST_SAY_NO]: (data: { actionId: string; accept: boolean; justSayNoCardId?: string }) => void;
  [EVENT_SUBMIT_PAYMENT]: (data: { actionId: string; selectedCardIds: string[]; surrenderDebtChip?: boolean }) => void;
  [EVENT_SUBMIT_REPOSSESS]: (data: { actionId: string; keepCardId: string; distributions: { cardId: string; targetPlayerId: string }[] }) => void;
  [EVENT_MOVE_SHACK]: (data: { fromColor: PropertyColor; toColor: PropertyColor }) => void;
}

export interface ServerToClientEvents {
  [EVENT_ROOM_CREATED]: (data: { room: Room; player: Player }) => void;
  [EVENT_ROOM_JOINED]: (data: { room: Room; player: Player }) => void;
  [EVENT_ROOM_UPDATED]: (data: { room: Room }) => void;
  [EVENT_GAME_STARTED]: (data: { room: Room; myHand: Card[] }) => void;
  [EVENT_GAME_STATE_UPDATE]: (data: {
    gameState: GameState;
    myHand: Card[];
    players: PublicPlayerView[];
    myPlayer: Player;
  }) => void;
  [EVENT_GAME_OVER]: (data: { winner: PublicPlayerView; breakdown: WinConditionResult }) => void;
  [EVENT_ERROR]: (data: { message: string }) => void;
  [EVENT_HOST_CHANGED]: (data: { newHostId: string; newHostName: string }) => void;
  [EVENT_EMOTE_RECEIVED]: (data: { playerId: string; playerName: string; emote: string }) => void;
}
