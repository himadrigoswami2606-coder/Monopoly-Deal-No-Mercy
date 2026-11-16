import React, { useState } from 'react';
import { ActionType, PropertyColor } from '../../../shared/types';
import { PROPERTY_CONFIG } from '../../../shared/deckConfig';
import { ActionIcon } from './CardIcons';

interface RulesHelpModalProps {
  onClose: () => void;
}

export const RulesHelpModal: React.FC<RulesHelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'actions' | 'properties' | 'debt'>('rules');

  const actionGuides: {
    type: ActionType;
    name: string;
    cashValue: number;
    count: number;
    rule: string;
    tip: string;
  }[] = [
    {
      type: ActionType.PASS_GO_GO_GO,
      name: 'Pass Go, Go, Go!',
      cashValue: 1,
      count: 4,
      rule: 'Draw cards from the draw pile until you hold 7 cards in your hand!',
      tip: 'The ultimate card refill! If you have 2 cards in hand, it draws 5 cards straight into your hand.',
    },
    {
      type: ActionType.GO_AGAIN,
      name: 'Go Again',
      cashValue: 2,
      count: 3,
      rule: 'Take another full turn immediately! Current plays are considered, you pick another 2 cards from the deck, and get 3 fresh plays right at that moment! Cannot be blocked by Just Say No.',
      tip: 'Play this on your 3rd shot to start a brand new turn and chain consecutive actions!',
    },
    {
      type: ActionType.PASS_GO,
      name: 'Pass Go',
      cashValue: 1,
      count: 4,
      rule: 'Draw cards from the draw pile until you hold 7 cards in your hand!',
      tip: 'Refills your hand up to the 7-card maximum limit.',
    },
    {
      type: ActionType.JUST_SAY_NO,
      name: 'Just Say No',
      cashValue: 4,
      count: 3,
      rule: 'Cancels ANY action card played against you (Sly Deal, Rent, Debt Collector, Yoink, etc.)! Can be played out of turn at any time.',
      tip: 'Can be countered by another Just Say No! Save these to protect your complete property sets from Super Sly Deal.',
    },
    {
      type: ActionType.SUPER_SLY_DEAL,
      name: 'Super Sly Deal',
      cashValue: 3,
      count: 2,
      rule: 'Steal an entire COMPLETE property set (including any attached Houses and Hotels) from an opponent!',
      tip: 'The deadliest card in No Mercy. Can instantly win you the game or dismantle a winning opponent.',
    },
    {
      type: ActionType.SLY_DEAL,
      name: 'Sly Deal',
      cashValue: 3,
      count: 3,
      rule: 'Steal 1 single property card from any opponent (cannot be stolen from a complete set).',
      tip: 'Snatch the key card an opponent needs to finish their set, or complete your own.',
    },
    {
      type: ActionType.FORCED_DEAL,
      name: 'Forced Deal',
      cashValue: 3,
      count: 3,
      rule: 'Swap 1 of your properties with 1 opponent property (neither can be from a complete set).',
      tip: 'Trade away a low-value brown or light blue property for an expensive green or dark blue!',
    },
    {
      type: ActionType.DOUBLE_THE_RENT,
      name: 'Double the Rent',
      cashValue: 1,
      count: 2,
      rule: 'Played alongside a Rent card to double the rent charged to opponents. Stackable with another Double Rent for 4x!',
      tip: 'Combines with green or dark blue sets for massive $14M to $32M rent demands!',
    },
    {
      type: ActionType.RENT,
      name: 'Rent & Wild Rent',
      cashValue: 1,
      count: 13,
      rule: 'Charge rent for any property color you own. Dual-color rents affect all players; Wild Rent affects 1 chosen player for any owned color.',
      tip: 'Rent increases with complete sets and attached Houses (+ $3M) / Hotels (+ $4M).',
    },
    {
      type: ActionType.DEBT_COLLECTOR,
      name: 'Debt Collector',
      cashValue: 3,
      count: 3,
      rule: 'Force 1 chosen player to pay you $5M in cash or properties.',
      tip: 'Target players with high bank balances, or push a cash-strapped player into surrendering a Debt Chip.',
    },
    {
      type: ActionType.ITS_MY_BIRTHDAY,
      name: "It's My Birthday",
      cashValue: 2,
      count: 3,
      rule: 'Every other player must pay you $2M each from their Bank or properties.',
      tip: 'Extremely effective in 4 to 6 player games to collect up to $10M in a single turn!',
    },
    {
      type: ActionType.YOINK,
      name: 'Yoink!',
      cashValue: 2,
      count: 2,
      rule: 'Steal up to $10M in cash directly from 1 opponent’s Bank!',
      tip: 'Prevents an opponent from reaching their $10M / $20M bank win condition while funding your own bank.',
    },
    {
      type: ActionType.REPOSSESS,
      name: 'Repossess',
      cashValue: 4,
      count: 2,
      rule: 'Force 1 opponent to surrender ALL of their property sets except 1 of their choice!',
      tip: 'Devastating against opponents who have spread out multiple property sets.',
    },
    {
      type: ActionType.TOUGH_LUCK,
      name: 'Tough Luck',
      cashValue: 3,
      count: 2,
      rule: 'Choose 1 opponent and a card category (Money, Property, or Action). They must discard ALL cards of that type from their hand!',
      tip: 'Wipes out defensive Just Say No action cards before you strike with Super Sly Deal.',
    },
    {
      type: ActionType.HOUSE,
      name: 'House',
      cashValue: 3,
      count: 3,
      rule: 'Adds +$3M rent to any complete property set (except Railroads & Utilities). Limit 1 House per set.',
      tip: 'Can also be banked as $3M cash if you have no complete set yet.',
    },
    {
      type: ActionType.HOTEL,
      name: 'Hotel',
      cashValue: 4,
      count: 2,
      rule: 'Adds +$4M rent to a complete property set that already has a House. Limit 1 Hotel per set.',
      tip: 'Combines with a House for a total +$7M rent boost per rent card!',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="max-w-3xl w-full bg-[#102b1e] border-2 border-amber-400 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f4d36] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎩</span>
            <div>
              <h2 className="font-heading font-extrabold text-xl text-slate-100 uppercase tracking-wide">
                Monopoly Deal: No Mercy Guide
              </h2>
              <div className="text-[11px] text-amber-300 font-medium">
                Official Rules, Card Compendium & Strategic Help
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#184a32] hover:bg-[#226344] flex items-center justify-center text-slate-300 hover:text-white font-bold transition-all border border-[#2d6a4f]"
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-[#1f4d36] pb-3 mb-4 overflow-x-auto">
          {[
            { id: 'rules', label: '📖 Core Rules', count: null },
            { id: 'debt', label: '🪙 Debt Chips', count: null },
            { id: 'actions', label: '⚡ Action Cards', count: 14 },
            { id: 'properties', label: '🏘️ Properties & Wilds', count: 10 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-[#081a12] text-slate-300 hover:bg-[#133826] border border-[#1f4d36]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="text-[10px] bg-black/20 px-1.5 rounded font-mono font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {/* TAB 1: CORE RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-[#0b2318] p-4 rounded-2xl border border-[#1f4d36]">
                <h3 className="font-heading font-extrabold text-amber-400 text-sm uppercase tracking-wide mb-1">
                  1. Objective & Victory Conditions
                </h3>
                <p className="text-slate-300 leading-relaxed mb-3">
                  Be the first player to fulfill all three victory criteria on your turn:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[#102b1e] p-3 rounded-xl border border-amber-400/40">
                    <div className="font-bold text-amber-400 uppercase text-xs mb-1">
                      Mode 1 — Standard No Mercy:
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• <strong>3 Full Property Sets</strong> of different colors</li>
                      <li>• At least <strong>$10M cash</strong> in your Bank</li>
                      <li>• <strong>All 3 of your own Debt Chips</strong> in your possession</li>
                    </ul>
                  </div>
                  <div className="bg-[#102b1e] p-3 rounded-xl border border-rose-400/40">
                    <div className="font-bold text-rose-400 uppercase text-xs mb-1">
                      Mode 2 — Extended No Mercy:
                    </div>
                    <ul className="space-y-1 text-slate-300 text-[11px]">
                      <li>• <strong>4 Full Property Sets</strong> of different colors</li>
                      <li>• At least <strong>$20M cash</strong> in your Bank</li>
                      <li>• <strong>All 3 of your own Debt Chips</strong> in your possession</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2318] p-4 rounded-2xl border border-[#1f4d36]">
                <h3 className="font-heading font-extrabold text-amber-400 text-sm uppercase tracking-wide mb-1">
                  2. Turn Structure (3 Plays Per Turn)
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed text-[11px]">
                  <li>
                    <strong>Deal & First Turn:</strong> The game starts with 5 cards dealt to each player. The player with the first turn picks 2 cards from the deck (making it 7 cards).
                  </li>
                  <li>
                    <strong>Recovering Debt Chips (Turn Start):</strong> If any opponents hold your Debt Chip, you pick up 2 cards from the deck (without mixing them into your hand). The person who got your Debt Chip first has top priority! Give 1 card to them to get your chip back (uses 1 play, 2 shots left). If 2 opponents hold your chips, give both cards to get both chips back (uses 2 plays, 1 shot left).
                  </li>
                  <li>
                    <strong>Play Maximum of 3 Shots (or None):</strong> You may play 0, 1, 2, or 3 cards on your turn. You can bank money or action cards, lay down properties, or launch aggressive action cards.
                  </li>
                  <li>
                    <strong>End Turn & Hand Limit:</strong> Click 'End Turn'. If you hold more than 7 cards in hand at the end of your turn, discard extras down to 7 cards.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: DEBT CHIPS */}
          {activeTab === 'debt' && (
            <div className="space-y-4">
              <div className="bg-[#0b2318] p-4 rounded-2xl border border-[#1f4d36]">
                <h3 className="font-heading font-extrabold text-amber-400 text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                  <span>🪙 Official Debt Chip Rules</span>
                </h3>
                <p className="text-slate-300 leading-relaxed mb-3">
                  Each player starts the game with <strong>3 Debt Chips</strong>. In No Mercy, players cannot walk away from debts!
                </p>

                <div className="space-y-3">
                  <div className="bg-[#102b1e] p-3 rounded-xl border border-slate-700">
                    <div className="font-bold text-rose-400 text-xs uppercase mb-1">
                      Going into Debt (Insolvency):
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Whenever you owe rent, birthday money, or debt collector payments to an opponent and you cannot pay the full amount using your Bank and laid-down properties, you must pay as much as you can, and then <strong>surrender 1 of your Debt Chips</strong> to that opponent.
                    </p>
                  </div>

                  <div className="bg-[#102b1e] p-3 rounded-xl border border-slate-700">
                    <div className="font-bold text-amber-400 text-xs uppercase mb-1">
                      Priority & Recovering Debt Chips:
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      • <strong>First-In First-Out Priority:</strong> The opponent who received your debt chip first has priority over anyone who received one later.<br />
                      • <strong>How to Recover:</strong> At turn start, you pick up 2 cards from the deck (unmixed with hand). Give 1 of those cards to the creditor who has your chip to get it back. This counts as 1 play (1 shot done, 2 shots left). If 2 players have your debt chips, use both drawn cards to get both chips back (2 shots done, 1 shot left).
                    </p>
                  </div>

                  <div className="bg-[#102b1e] p-3 rounded-xl border border-slate-700">
                    <div className="font-bold text-emerald-400 text-xs uppercase mb-1">
                      Win Requirement:
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      You <strong>CANNOT WIN</strong> while any opponent holds one of your Debt Chips! You must reclaim all 3 of your own chips to declare victory.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTION CARDS */}
          {activeTab === 'actions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionGuides.map((act) => (
                <div
                  key={act.type}
                  className="bg-[#0b2318] p-3.5 rounded-2xl border border-[#1f4d36] flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#1b3d2b] mb-2">
                      <div className="flex items-center gap-2">
                        <ActionIcon type={act.type} className="w-6 h-6" />
                        <span className="font-heading font-extrabold text-sm uppercase text-slate-100">
                          {act.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        Bank: ${act.cashValue}M
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                      {act.rule}
                    </p>
                  </div>
                  <div className="text-[10px] text-amber-300/90 bg-[#102b1e] p-2 rounded-xl border border-[#1b3d2b] italic">
                    💡 <strong>Strategy:</strong> {act.tip}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: PROPERTIES & WILDS */}
          {activeTab === 'properties' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PROPERTY_CONFIG).map(([colorKey, meta]) => (
                  <div
                    key={colorKey}
                    className="bg-[#0b2318] rounded-2xl overflow-hidden border border-slate-800 shadow"
                  >
                    <div
                      className="px-3 py-2 flex items-center justify-between font-heading font-bold text-xs uppercase shadow-sm"
                      style={{ backgroundColor: meta.hexColor, color: meta.textColor }}
                    >
                      <span>{meta.name}</span>
                      <span>Set Size: {meta.setSize}</span>
                    </div>
                    <div className="p-3 bg-[#102b1e] space-y-1 text-[11px]">
                      <div className="text-slate-400 font-bold uppercase text-[9px] mb-1">Rent Scale:</div>
                      {meta.rentValues.map((rent, i) => (
                        <div key={i} className="flex justify-between text-slate-300">
                          <span>{i + 1} card{i > 0 ? 's' : ''} {i === meta.setSize - 1 ? '★' : ''}:</span>
                          <span className="font-mono font-bold text-emerald-400">${rent}M</span>
                        </div>
                      ))}
                      {colorKey !== PropertyColor.RAILROAD && colorKey !== PropertyColor.UTILITY && (
                        <div className="pt-1.5 mt-1 border-t border-[#1b3d2b] text-[10px] text-slate-400 flex justify-between">
                          <span>House: +$3M</span>
                          <span>Hotel: +$4M</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1f4d36] flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-xl font-heading font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 uppercase tracking-wider text-xs transition-colors shadow"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
