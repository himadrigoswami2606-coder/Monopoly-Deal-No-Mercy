import React, { useState, useEffect } from 'react';
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
    marketCrashSelections?: Record<string, string>;
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
    card.colors?.[0] || card.color || PropertyColor.DARK_BLUE
  );
  const [selectedOpponentCardId, setSelectedOpponentCardId] = useState<string | undefined>();
  const [selectedMyCardId, setSelectedMyCardId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<'MONEY' | 'PROPERTY' | 'ACTION'>('ACTION');

  // Market Crash selections: mapping of opponentId -> propertyCardId
  const [marketCrashSelections, setMarketCrashSelections] = useState<Record<string, string>>({});

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
  const isDoubleRent = card.actionType === ActionType.DOUBLE_THE_RENT;
  const isRent = card.actionType === ActionType.RENT || isDoubleRent;

  // Dual Rent vs Wild Rent
  const isWildRent = card.isWildRent;

  // Incomplete property sets of opponent (for Sly Deal & Forced Deal)
  const incompleteOpponentSets = selectedOpponent?.properties.filter((s) => !s.isComplete) || [];
  // Complete sets of opponent (for Deal Breaker)
  const completeOpponentSets = selectedOpponent?.properties.filter((s) => s.isComplete) || [];

  // Opponents who own property cards for Market Crash
  const opponentsWithProperties = opponents.filter((opp) =>
    opp.properties.some((s) => s.cards.length > 0)
  );

  // Pre-initialize Market Crash selections with highest value card per opponent
  useEffect(() => {
    if (isMarketCrash) {
      const initial: Record<string, string> = {};
      opponentsWithProperties.forEach((opp) => {
        let bestCard: Card | null = null;
        opp.properties.forEach((set) => {
          set.cards.forEach((c) => {
            if (!bestCard || c.cashValue > bestCard.cashValue) {
              bestCard = c;
            }
          });
        });
        if (bestCard) {
          initial[opp.id] = (bestCard as Card).id;
        }
      });
      setMarketCrashSelections(initial);
    }
  }, [isMarketCrash]);

  // Actions that require choosing a SINGLE target opponent:
  // Note: Super Sly Deal, Market Crash, Heist, and Dual Rent target ALL opponents!
  const needsOpponentPicker =
    isSlyDeal ||
    isForcedDeal ||
    isDebtCollector ||
    isYoink ||
    isRepossess ||
    isToughLuck ||
    isDealBreaker ||
    isTaxCollector ||
    isUnfairTrade ||
    isWildRent;

  // For Super Sly Deal: calculate how many cards opponents hold in each color
  const colorOpponentHoldings = Object.values(PropertyColor).map((col) => {
    let totalCards = 0;
    const holderNames: string[] = [];
    opponents.forEach((opp) => {
      let count = 0;
      opp.properties.forEach((s) => {
        s.cards.forEach((c) => {
          const matches =
            c.color === col ||
            c.isRainbow ||
            (c.colors && c.colors.includes(col));
          if (matches) count++;
        });
      });
      if (count > 0) {
        totalCards += count;
        holderNames.push(opp.displayName);
      }
    });
    return {
      color: col,
      config: PROPERTY_CONFIG[col],
      totalCards,
      holderNames,
    };
  });

  const handleConfirm = () => {
    onConfirm({
      targetPlayerId: isWildRent || needsOpponentPicker ? selectedOpponentId : undefined,
      targetColor: selectedColor,
      targetCardId: selectedOpponentCardId,
      myCardId: selectedMyCardId,
      chosenCategory: selectedCategory,
      marketCrashSelections: isMarketCrash ? marketCrashSelections : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
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

        {/* 1. Opponent Picker (for single-target actions) */}
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
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate text-slate-200">
                        {opp.displayName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${opp.bankTotal}M Bank
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 1B. Tough Luck: Choose Category to Steal */}
        {isToughLuck && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
              Choose Card Category to Demand from {selectedOpponent?.displayName}:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ACTION', 'MONEY', 'PROPERTY'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/40 text-amber-300 font-bold shadow'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xl mb-1">
                    {cat === 'ACTION' ? '⚡' : cat === 'MONEY' ? '💵' : '🏠'}
                  </div>
                  <div className="text-xs font-bold uppercase">{cat}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {cat === 'ACTION' ? 'All action cards' : cat === 'MONEY' ? 'All cash cards' : 'All property cards'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Sly Deal: Choose incomplete property to steal */}
        {isSlyDeal && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose Incomplete Property to Steal:
            </label>
            {incompleteOpponentSets.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                {selectedOpponent?.displayName} does not have any incomplete property sets! (Complete sets cannot be stolen with Sly Deal).
              </div>
            ) : (
              <div className="space-y-2">
                {incompleteOpponentSets.map((set) => (
                  <div key={set.color} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
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
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                              : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          {c.name} (${c.cashValue}M)
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2B. Forced Deal: Choose opponent incomplete property & your incomplete property */}
        {isForcedDeal && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Choose Opponent's Incomplete Property to Take:
              </label>
              {incompleteOpponentSets.length === 0 ? (
                <div className="text-xs text-rose-400 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
                  {selectedOpponent?.displayName} has no incomplete properties to swap!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {incompleteOpponentSets.map((set) => (
                    <div key={set.color} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-bold uppercase mb-1" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                        {PROPERTY_CONFIG[set.color]?.name} Set
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {set.cards.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedOpponentCardId(c.id)}
                            className={`text-xs px-2 py-0.5 rounded border ${
                              selectedOpponentCardId === c.id
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                            }`}
                          >
                            {c.name} (${c.cashValue}M)
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Choose YOUR Incomplete Property to Give:
              </label>
              {myPlayer.properties.filter((s) => !s.isComplete).length === 0 ? (
                <div className="text-xs text-rose-400 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
                  You do not have any incomplete properties to give!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {myPlayer.properties.filter((s) => !s.isComplete).map((set) => (
                    <div key={set.color} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                      <div className="text-[10px] font-bold uppercase mb-1" style={{ color: PROPERTY_CONFIG[set.color]?.hexColor }}>
                        Your {PROPERTY_CONFIG[set.color]?.name} Set
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {set.cards.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedMyCardId(c.id)}
                            className={`text-xs px-2 py-0.5 rounded border ${
                              selectedMyCardId === c.id
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                            }`}
                          >
                            {c.name} (${c.cashValue}M)
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Super Sly Deal: Official Rule: Choose 1 Property Color to Seize across ALL Opponents! */}
        {isSuperSlyDeal && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                👑 Choose Property Color to Steal (From All Opponents):
              </label>
            </div>
            <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed bg-[#102b1e] p-2 rounded-xl border border-[#1f4d36]">
              According to official Super Sly Deal rules, you choose <strong>1 color</strong>. <strong>Every opponent</strong> who holds properties in that color must surrender them to you — whether single cards, doubles, or even from full complete sets!
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
              {colorOpponentHoldings.map((item) => {
                const isSelected = selectedColor === item.color;
                const hasCards = item.totalCards > 0;
                return (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setSelectedColor(item.color)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                        : hasCards
                        ? 'bg-slate-950/70 border-slate-700 hover:border-amber-400/50'
                        : 'bg-slate-950/30 border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="font-heading font-black text-xs uppercase"
                        style={{ color: item.config?.hexColor }}
                      >
                        {item.config?.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          hasCards ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {item.totalCards} cards
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {hasCards ? `Held by: ${item.holderNames.join(', ')}` : 'No opponents hold this color'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Market Crash: Choose 1 Property to Steal from EACH Opponent */}
        {isMarketCrash && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-300">
                📉 Choose 1 Property to Steal From Each Player:
              </label>
            </div>
            <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed bg-[#1e1313] p-2 rounded-xl border border-rose-900/40">
              Market Crash lets you seize <strong>1 property card from every other player</strong> on the table (complete sets CAN be broken, and attached Shacks transfer along!). Click a card under each player to select it.
            </p>

            {opponentsWithProperties.length === 0 ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                None of your opponents have properties on the table!
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {opponentsWithProperties.map((opp) => {
                  const colorTheme = PLAYER_COLORS[opp.colorIndex % PLAYER_COLORS.length];
                  const currentSelectedCardId = marketCrashSelections[opp.id];

                  return (
                    <div
                      key={opp.id}
                      className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 ${colorTheme.bg}`}
                          >
                            {opp.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-xs text-slate-200">{opp.displayName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ${opp.bankTotal}M Bank
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {opp.properties.flatMap((s) =>
                          s.cards.map((c) => {
                            const isChosen = currentSelectedCardId === c.id;
                            const hasShack = s.shack;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() =>
                                  setMarketCrashSelections((prev) => ({
                                    ...prev,
                                    [opp.id]: c.id,
                                  }))
                                }
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  isChosen
                                    ? 'bg-rose-500/20 border-rose-400 ring-2 ring-rose-400/40 shadow'
                                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                }`}
                              >
                                <div
                                  className="text-[10px] font-bold uppercase truncate"
                                  style={{ color: PROPERTY_CONFIG[s.color]?.hexColor }}
                                >
                                  {c.name}
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                                  <span className="font-mono text-emerald-400 font-bold">${c.cashValue}M</span>
                                  {hasShack && <span className="text-amber-400">🛖 Shack</span>}
                                  {isChosen && <span className="text-rose-400 font-bold">✓ Picked</span>}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Deal Breaker: Steal 1 complete set */}
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

        {/* 6. Heist Banner */}
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

        {/* 7. Rent Color Selector (Dual-color Rent or Wild Rent) */}
        {isRent && (
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Choose Rent Color:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(card.rentColors || card.colors || Object.keys(PROPERTY_CONFIG) as PropertyColor[])
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
              <div className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-xl border border-rose-500/30 mt-2">
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
            {isSuperSlyDeal
              ? `Steal All ${PROPERTY_CONFIG[selectedColor || PropertyColor.DARK_BLUE]?.name || ''} Properties`
              : isMarketCrash
              ? `Steal ${Object.keys(marketCrashSelections).length} Selected Properties`
              : 'Confirm & Play'}
          </button>
        </div>
      </div>
    </div>
  );
};
