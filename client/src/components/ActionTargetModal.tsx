import React, { useState } from 'react';
import {
  Card,
  ActionType,
  PropertyColor,
  PublicPlayerView,
  Player,
} from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { PLAYER_COLORS } from './PlayerCard';

interface ActionTargetModalProps {
  card: Card;
  myPlayer: Player;
  opponents: PublicPlayerView[];
  onConfirm: (options: {
    targetPlayerId?: string;
    targetColor?: PropertyColor;
    targetCardId?: string;
    myCardId?: string;
    chosenCategory?: 'MONEY' | 'PROPERTY' | 'ACTION';
  }) => void;
  onCancel: () => void;
}

export const ActionTargetModal: React.FC<ActionTargetModalProps> = ({
  card,
  myPlayer,
  opponents,
  onConfirm,
  onCancel,
}) => {
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>(
    opponents[0]?.id || ''
  );
  const [selectedColor, setSelectedColor] = useState<PropertyColor | undefined>(
    card.colors?.[0] || card.color
  );
  const [selectedOpponentCardId, setSelectedOpponentCardId] = useState<string | undefined>();
  const [selectedMyCardId, setSelectedMyCardId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<'MONEY' | 'PROPERTY' | 'ACTION'>('ACTION');

  const selectedOpponent = opponents.find((p) => p.id === selectedOpponentId);

  // Check action type requirements
  const isSlyDeal = card.actionType === ActionType.SLY_DEAL;
  const isSuperSlyDeal = card.actionType === ActionType.SUPER_SLY_DEAL;
  const isForcedDeal = card.actionType === ActionType.FORCED_DEAL;
  const isForcedDebt = card.actionType === ActionType.FORCED_DEBT;
  const isDebtCollector = isForcedDebt;
  const isYoink = card.actionType === ActionType.YOINK;
  const isRepossess = card.actionType === ActionType.REPOSSESS;
  const isToughLuck = card.actionType === ActionType.TOUGH_LUCK;
  const isDealBreaker = card.actionType === ActionType.DEAL_BREAKER;
  const isHeist = card.actionType === ActionType.HEIST;
  const isMarketCrash = card.actionType === ActionType.MARKET_CRASH;
  const isTaxCollector = card.actionType === ActionType.TAX_COLLECTOR;
  const isUnfairTrade = card.actionType === ActionType.UNFAIR_TRADE;
  const isHouseOrHotel =
    card.actionType === ActionType.HOUSE ||
    card.actionType === ActionType.HOTEL ||
    card.actionType === ActionType.SHACK;
  const isWildcard = card.type === 'PROPERTY_WILDCARD' as any;
  const isDoubleRent = card.actionType === ActionType.DOUBLE_THE_RENT;
  const isRent = card.actionType === ActionType.RENT || isDoubleRent;

  // For Rainbow Wildcard (Point 9): only colors player already owns in property sets
  const ownedColors = Array.from(new Set(myPlayer.properties.map((s) => s.color)));
  const availableWildColors = card.isRainbow
    ? ownedColors
    : (card.colors || (Object.keys(PROPERTY_CONFIG) as PropertyColor[]));

  // Incomplete property sets of opponent (for Sly Deal & Forced Deal)
  const incompleteOpponentSets = selectedOpponent?.properties.filter((s) => !s.isComplete) || [];
  // Complete sets of opponent (for Super Sly Deal & Deal Breaker)
  const completeOpponentSets = selectedOpponent?.properties.filter((s) => s.isComplete) || [];

  const needsOpponentPicker =
    isSlyDeal ||
    isSuperSlyDeal ||
    isForcedDeal ||
    isDebtCollector ||
    isYoink ||
    isRepossess ||
    isToughLuck ||
    isDealBreaker ||
    isTaxCollector ||
    isUnfairTrade;

  const handleConfirm = () => {
    onConfirm({
      targetPlayerId: selectedOpponentId,
      targetColor: selectedColor,
      targetCardId: selectedOpponentCardId,
      myCardId: selectedMyCardId,
      chosenCategory: selectedCategory,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-lg w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-heading font-extrabold text-base md:text-lg uppercase tracking-wider text-amber-400">
              Play {card.name}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          {card.description}
        </p>

        {/* 1. Opponent Picker (if targeted action) */}
        {needsOpponentPicker && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Target Opponent:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {opponents.map((opp) => {
                const colorTheme = PLAYER_COLORS[opp.colorIndex % PLAYER_COLORS.length];
                const isSelected = opp.id === selectedOpponentId;
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => {
                      setSelectedOpponentId(opp.id);
                      setSelectedOpponentCardId(undefined);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 ${colorTheme.bg}`}
                    >
                      {opp.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{opp.displayName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ${opp.bankTotal}M Bank
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Sly Deal or Forced Deal: Choose opponent's property card */}
        {(isSlyDeal || isForcedDeal) && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose Opponent's Incomplete Property to Take:
            </label>
            {incompleteOpponentSets.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                {selectedOpponent?.displayName} has no incomplete properties to take!
              </div>
            ) : (
              <div className="space-y-2">
                {incompleteOpponentSets.map((set) => (
                  <div key={set.color} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-bold uppercase mb-1.5" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                      {PROPERTY_CONFIG[set.color]?.name} Set ({set.cards.length} cards)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {set.cards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedOpponentCardId(c.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                            selectedOpponentCardId === c.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forced Deal: Choose your own property to give */}
        {isForcedDeal && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose YOUR Incomplete Property to Give:
            </label>
            {myPlayer.properties.filter((s) => !s.isComplete).length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                You do not have any incomplete properties to swap!
              </div>
            ) : (
              <div className="space-y-2">
                {myPlayer.properties.filter((s) => !s.isComplete).map((set) => (
                  <div key={set.color} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="text-[11px] font-bold uppercase mb-1.5" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                      Your {PROPERTY_CONFIG[set.color]?.name} Set
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {set.cards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedMyCardId(c.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                            selectedMyCardId === c.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Super Sly Deal: Choose entire complete set to steal */}
        {isSuperSlyDeal && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose Complete Set to Steal:
            </label>
            {completeOpponentSets.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                {selectedOpponent?.displayName} does not have any complete property sets!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {completeOpponentSets.map((set) => (
                  <button
                    key={set.color}
                    type="button"
                    onClick={() => setSelectedColor(set.color)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedColor === set.color
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs uppercase" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                      {PROPERTY_CONFIG[set.color]?.name} Set ✓
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {set.cards.length} cards {set.house ? '+ House' : ''} {set.hotel ? '+ Hotel' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3B. Deal Breaker: Steal 1 complete property set */}
        {isDealBreaker && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose Complete Set to Steal:
            </label>
            {completeOpponentSets.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                {selectedOpponent?.displayName} does not have any complete property sets to steal!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {completeOpponentSets.map((set) => (
                  <button
                    key={set.color}
                    type="button"
                    onClick={() => setSelectedColor(set.color)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedColor === set.color
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs uppercase" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                      {PROPERTY_CONFIG[set.color]?.name} Set ({set.cards.length} cards)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {set.shack ? '🛖 Shack ' : ''}{set.house ? '🏠 House ' : ''}{set.hotel ? '🏨 Hotel' : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3C. Heist: Raids Every Opponent's Bank */}
        {isHeist && (
          <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-200">
            <div className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-1.5">
              <span>💰</span> Raids Every Opponent's Bank!
            </div>
            <p>
              Heist will steal 1 card from <strong>every other player's Bank</strong> directly into your own Bank!
            </p>
            <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
              • Empty banks give nothing (no debt chips are taken).<br />
              • Each opponent can play Just Say No to protect their bank.
            </p>
          </div>
        )}

        {/* 3D. Market Crash: Dismantles Every Opponent's Properties */}
        {isMarketCrash && (
          <div className="mb-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-200">
            <div className="font-bold text-rose-300 text-sm mb-1 flex items-center gap-1.5">
              <span>📉</span> Dismantles Every Opponent's Properties!
            </div>
            <p>
              Market Crash will seize 1 property card from <strong>every other player's collection</strong> on the table into your collection!
            </p>
            <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
              • Complete sets CAN be broken.<br />
              • If the stolen property has a Shack attached, the Shack transfers along with it.<br />
              • Opponents can play Just Say No to protect their properties.
            </p>
          </div>
        )}

        {/* 3E. Tax Collector */}
        {isTaxCollector && (
          <div className="mb-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200">
            <div className="font-bold text-amber-300 text-sm mb-1 flex items-center gap-1.5">
              <span>🏛️</span> Tax Collector
            </div>
            <p>
              Target <strong>{selectedOpponent?.displayName}</strong>. They will choose 1 card to keep in their Bank, and distribute all other Bank cards to the table!
            </p>
            <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
              • If their Bank has 1 or 0 cards, they keep it and give away nothing (no debt chip).<br />
              • Can be blocked with Just Say No.
            </p>
          </div>
        )}

        {/* 3F. Unfair Trade */}
        {isUnfairTrade && (
          <div className="mb-4 bg-purple-950/40 border border-purple-500/30 rounded-2xl p-3 text-xs text-purple-200">
            <div className="font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
              <span>⚖️</span> Swap Entire Banks!
            </div>
            <p>
              Swap your entire Bank ({myPlayer.bank.length} cards, ${myPlayer.bank.reduce((s, c) => s + c.cashValue, 0)}M) with <strong>{selectedOpponent?.displayName}</strong>'s Bank ({selectedOpponent?.bankCards?.length || selectedOpponent?.bankCount || 0} cards, ${selectedOpponent?.bankTotal}M)!
            </p>
            {myPlayer.bank.length === 0 ? (
              <div className="mt-2 text-rose-400 font-bold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                ⚠️ Your Bank is empty! Official rule: You must have at least 1 card in your Bank to legally make an Unfair Trade.
              </div>
            ) : (
              <p className="mt-1.5 text-slate-400 text-[11px] leading-relaxed">
                • Target can block with Just Say No.
              </p>
            )}
          </div>
        )}

        {/* 4. Tough Luck: Choose category */}
        {isToughLuck && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Discard Category:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['MONEY', 'PROPERTY', 'ACTION'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-2 px-3 rounded-xl border font-heading font-bold text-xs uppercase transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {cat} Cards
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Wildcard Color Selector */}
        {isWildcard && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Color Set to Place In:
            </label>
            {card.isRainbow && availableWildColors.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                You must already own at least one property to add a Rainbow Wildcard! You can bank this card as cash instead.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableWildColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                      selectedColor === c
                        ? 'ring-2 ring-amber-400 border-transparent shadow'
                        : 'border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: PROPERTY_CONFIG[c]?.hexColor,
                      color: PROPERTY_CONFIG[c]?.textColor,
                    }}
                  >
                    {PROPERTY_CONFIG[c]?.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. Shack / House / Hotel: Target property set */}
        {isHouseOrHotel && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {card.actionType === ActionType.SHACK
                ? 'Attach Shack to which Property (+ $3M Rent)?'
                : 'Attach to which Complete Set?'}
            </label>
            {(card.actionType === ActionType.SHACK
              ? myPlayer.properties
              : myPlayer.properties.filter((s) => s.isComplete && s.color !== PropertyColor.RAILROAD && s.color !== PropertyColor.UTILITY)
            ).length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                You do not have an eligible property set yet! You can bank this card as cash instead.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(card.actionType === ActionType.SHACK
                  ? myPlayer.properties
                  : myPlayer.properties.filter((s) => s.isComplete && s.color !== PropertyColor.RAILROAD && s.color !== PropertyColor.UTILITY)
                ).map((set) => (
                  <button
                    key={set.color}
                    type="button"
                    onClick={() => setSelectedColor(set.color)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedColor === set.color
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs uppercase" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                      {PROPERTY_CONFIG[set.color]?.name} ({set.cards.length} cards)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. Rent / Double the Rent Card: Pick which color set to charge rent for */}
        {isRent && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {isDoubleRent
                ? '⚡ Double Rent for which Owned Color Set? (Charges 2x Rent to Players)'
                : 'Charge Rent for which Owned Color?'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(card.rentColors || (Object.keys(PROPERTY_CONFIG) as PropertyColor[]))
                .filter((c) => myPlayer.properties.some((s) => s.color === c))
                .map((c) => {
                  const set = myPlayer.properties.find((s) => s.color === c);
                  const count = set ? set.cards.length : 0;
                  const baseRent =
                    PROPERTY_CONFIG[c]?.rentValues?.[
                      Math.min(count - 1, (PROPERTY_CONFIG[c]?.rentValues?.length || 1) - 1)
                    ] || 1;
                  const shackBonus = set?.shack ? 3 : 0;
                  const houseBonus = set?.house ? 3 : 0;
                  const hotelBonus = set?.hotel ? 4 : 0;
                  const totalBase = baseRent + shackBonus + houseBonus + hotelBonus;
                  const chargedRent = isDoubleRent ? totalBase * 2 : totalBase;

                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedColor === c
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="font-bold text-xs uppercase"
                        style={{ color: PROPERTY_CONFIG[c]?.hexColor }}
                      >
                        {PROPERTY_CONFIG[c]?.name} ({count} cards)
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5 font-bold">
                        {isDoubleRent ? (
                          <span>
                            Base: ${totalBase}M ➔{' '}
                            <strong className="text-amber-300">DOUBLED: ${chargedRent}M</strong>
                          </span>
                        ) : (
                          <span>
                            Rent: ${baseRent}M {set?.shack ? '+ $3M Shack' : ''}{' '}
                            {set?.house ? '+ $3M House' : ''} {set?.hotel ? '+ $4M Hotel' : ''} = $
                            {totalBase}M
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
            {myPlayer.properties.length === 0 && (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                You do not own any properties in these colors! You can bank this card as cash instead.
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 px-4 rounded-xl font-bold text-slate-400 hover:text-white bg-slate-800 border border-slate-700 text-xs uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isUnfairTrade && myPlayer.bank.length === 0}
            className={`w-2/3 py-2.5 px-4 rounded-xl font-heading font-bold text-slate-950 text-xs uppercase tracking-wider shadow-lg transition-all ${
              isUnfairTrade && myPlayer.bank.length === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-amber-500/20 active:scale-95'
            }`}
          >
            Confirm & Play
          </button>
        </div>
      </div>
    </div>
  );
};
