import React from 'react';
import { ActionType } from '../../../shared/types';

// ============================================================================
// Monopoly Deal: No Mercy — Official Vector Iconography
// ============================================================================

export const MoneyBanknotePattern: React.FC<{ value: number }> = ({ value }) => (
  <svg viewBox="0 0 160 100" className="w-full h-full opacity-90">
    <defs>
      <pattern id={`filigree-${value}`} width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M 0 6 Q 6 0 12 6 Q 6 12 0 6" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.25" />
      </pattern>
      <radialGradient id={`glow-${value}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Guilloche Border */}
    <rect x="4" y="4" width="152" height="92" rx="6" fill={`url(#filigree-${value})`} stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 1.5" />
    <rect x="8" y="8" width="144" height="84" rx="4" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="80" cy="50" r="32" fill={`url(#glow-${value})`} stroke="currentColor" strokeWidth="1.2" />
    {/* Corner values */}
    <text x="14" y="22" fontFamily="Oswald, sans-serif" fontSize="11" fontWeight="bold" fill="currentColor">M{value}</text>
    <text x="146" y="22" fontFamily="Oswald, sans-serif" fontSize="11" fontWeight="bold" textAnchor="end" fill="currentColor">M{value}</text>
    <text x="14" y="86" fontFamily="Oswald, sans-serif" fontSize="11" fontWeight="bold" fill="currentColor">M{value}</text>
    <text x="146" y="86" fontFamily="Oswald, sans-serif" fontSize="11" fontWeight="bold" textAnchor="end" fill="currentColor">M{value}</text>
    {/* Center Seal */}
    <circle cx="80" cy="50" r="26" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <text x="80" y="58" fontFamily="Oswald, sans-serif" fontSize="26" fontWeight="900" textAnchor="middle" fill="currentColor" letterSpacing="-1">
      ${value}M
    </text>
  </svg>
);

export const ActionIcon: React.FC<{ type: ActionType; className?: string }> = ({ type, className = 'w-10 h-10' }) => {
  switch (type) {
    case ActionType.PASS_GO:
    case ActionType.PASS_GO_GO_GO:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor">
          <circle cx="32" cy="32" r="28" fill="#eab308" fillOpacity="0.15" stroke="#eab308" strokeWidth="2.5" />
          <path d="M 18 32 L 40 32 M 32 20 L 44 32 L 32 44" stroke="#facc15" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 22 20 Q 32 14 42 20" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case ActionType.GO_AGAIN:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="2.5" />
          {/* Circular loop arrows */}
          <path
            d="M 22 32 A 10 10 0 1 1 32 42 L 32 46 M 32 42 L 28 38 M 32 42 L 36 38"
            stroke="#34d399"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 42 32 A 10 10 0 1 1 32 22 L 32 18 M 32 22 L 28 26 M 32 22 L 36 26"
            stroke="#34d399"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case ActionType.JUST_SAY_NO:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          {/* Octagon Stop Sign */}
          <polygon points="20,6 44,6 58,20 58,44 44,58 20,58 6,44 6,20" fill="#dc2626" stroke="#fecaca" strokeWidth="2" />
          {/* Raised Palm */}
          <path d="M 24 38 L 24 24 C 24 22 26 22 26 24 L 26 34 M 28 22 C 28 20 30 20 30 22 L 30 34 M 32 20 C 32 18 34 18 34 20 L 34 34 M 36 24 C 36 22 38 22 38 24 L 38 36 C 38 42 32 46 26 44 L 21 38 C 20 37 21 35 23 36 L 26 38" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case ActionType.DOUBLE_THE_RENT:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <rect x="8" y="12" width="48" height="40" rx="8" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="32" y="38" fontFamily="Oswald, sans-serif" fontSize="22" fontWeight="900" textAnchor="middle" fill="#fbbf24">
            2X
          </text>
          <path d="M 16 46 L 48 46" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      );

    case ActionType.SUPER_SLY_DEAL:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#9333ea" fillOpacity="0.2" stroke="#a855f7" strokeWidth="2.5" />
          {/* Large Magnet pulling property cards */}
          <path d="M 18 20 C 18 12 46 12 46 20 L 46 32 C 46 36 40 36 40 32 L 40 22 C 40 18 24 18 24 22 L 24 32 C 24 36 18 36 18 32 Z" fill="#c084fc" />
          <rect x="18" y="28" width="6" height="8" fill="#ef4444" />
          <rect x="40" y="28" width="6" height="8" fill="#3b82f6" />
          {/* Crown */}
          <path d="M 24 48 L 28 42 L 32 48 L 36 42 L 40 48 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      );

    case ActionType.SLY_DEAL:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="2.5" />
          {/* Sneaky glove snatching card */}
          <rect x="26" y="16" width="18" height="26" rx="2" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" transform="rotate(15 35 29)" />
          <path d="M 12 46 C 20 40 28 36 36 34 L 38 38 C 30 42 24 46 16 52 Z" fill="#93c5fd" />
        </svg>
      );

    case ActionType.FORCED_DEAL:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="2.5" />
          {/* Curved swap arrows */}
          <path d="M 18 26 C 22 18 34 16 44 22" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
          <polygon points="44,16 48,24 40,24" fill="#22d3ee" />
          <path d="M 46 38 C 42 46 30 48 20 42" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
          <polygon points="20,48 16,40 24,40" fill="#22d3ee" />
        </svg>
      );

    case ActionType.FORCED_DEBT:
    case ActionType.DEBT_COLLECTOR:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#eab308" fillOpacity="0.2" stroke="#eab308" strokeWidth="2.5" />
          {/* Forced Debt token emblem */}
          <circle cx="32" cy="32" r="16" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
          <text x="32" y="38" fontFamily="Oswald, sans-serif" fontSize="16" fontWeight="900" textAnchor="middle" fill="#78350f">🪙</text>
        </svg>
      );

    case ActionType.ITS_MY_BIRTHDAY:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#ec4899" fillOpacity="0.2" stroke="#ec4899" strokeWidth="2.5" />
          {/* Birthday Cake with candles */}
          <rect x="18" y="34" width="28" height="16" rx="3" fill="#f472b6" />
          <rect x="22" y="26" width="20" height="8" rx="2" fill="#fbcfe8" />
          <rect x="26" y="18" width="2" height="8" fill="#fbbf24" />
          <rect x="31" y="18" width="2" height="8" fill="#fbbf24" />
          <rect x="36" y="18" width="2" height="8" fill="#fbbf24" />
          <circle cx="27" cy="16" r="1.5" fill="#f97316" />
          <circle cx="32" cy="16" r="1.5" fill="#f97316" />
          <circle cx="37" cy="16" r="1.5" fill="#f97316" />
        </svg>
      );

    case ActionType.YOINK:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#e11d48" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="2.5" />
          {/* Vault with open door & cash bills */}
          <rect x="14" y="16" width="36" height="34" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="32" cy="33" r="6" stroke="#fbbf24" strokeWidth="2" />
          <path d="M 32 27 L 32 39 M 26 33 L 38 33" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M 36 20 L 52 14" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case ActionType.REPOSSESS:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#dc2626" fillOpacity="0.2" stroke="#dc2626" strokeWidth="2.5" />
          {/* Auction Gavel */}
          <rect x="16" y="24" width="20" height="10" rx="2" fill="#b91c1c" stroke="#fca5a5" strokeWidth="1" transform="rotate(-30 26 29)" />
          <rect x="24" y="32" width="6" height="22" rx="2" fill="#78350f" transform="rotate(-30 27 43)" />
        </svg>
      );

    case ActionType.TOUGH_LUCK:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#475569" fillOpacity="0.3" stroke="#94a3b8" strokeWidth="2.5" />
          {/* Skull with glowing eyes */}
          <circle cx="32" cy="28" r="14" fill="#cbd5e1" />
          <rect x="25" y="36" width="14" height="10" rx="2" fill="#cbd5e1" />
          <circle cx="26" cy="28" r="3.5" fill="#0f172a" />
          <circle cx="38" cy="28" r="3.5" fill="#0f172a" />
          <polygon points="32,32 30,36 34,36" fill="#0f172a" />
          <path d="M 27 44 L 27 40 M 32 44 L 32 40 M 37 44 L 37 40" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case ActionType.SHACK:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          {/* Wooden Shack */}
          <polygon points="32,8 10,26 54,26" fill="#854d0e" stroke="#713f12" strokeWidth="2" />
          <rect x="14" y="26" width="36" height="26" fill="#a16207" stroke="#713f12" strokeWidth="2" />
          <rect x="27" y="36" width="10" height="16" fill="#451a03" />
          <rect x="18" y="30" width="6" height="6" fill="#fef08a" stroke="#713f12" strokeWidth="1" />
          <rect x="40" y="30" width="6" height="6" fill="#fef08a" stroke="#713f12" strokeWidth="1" />
          {/* Chimney */}
          <rect x="42" y="10" width="6" height="10" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        </svg>
      );

    case ActionType.HOUSE:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          {/* 3D Green Monopoly House */}
          <polygon points="32,10 14,24 50,24" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
          <rect x="18" y="24" width="28" height="26" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
          <rect x="28" y="36" width="8" height="14" fill="#14532d" />
          <rect x="21" y="28" width="5" height="6" fill="#86efac" />
          <rect x="38" y="28" width="5" height="6" fill="#86efac" />
        </svg>
      );

    case ActionType.HOTEL:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          {/* 3D Red Monopoly Hotel */}
          <polygon points="32,8 12,22 52,22" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
          <rect x="16" y="22" width="32" height="32" fill="#dc2626" stroke="#b91c1c" strokeWidth="1.5" />
          <rect x="28" y="40" width="8" height="14" fill="#7f1d1d" />
          <rect x="20" y="26" width="5" height="5" fill="#fca5a5" />
          <rect x="39" y="26" width="5" height="5" fill="#fca5a5" />
          <rect x="20" y="33" width="5" height="5" fill="#fca5a5" />
          <rect x="39" y="33" width="5" height="5" fill="#fca5a5" />
        </svg>
      );

    case ActionType.RENT:
    default:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <circle cx="32" cy="32" r="28" fill="#eab308" fillOpacity="0.2" stroke="#eab308" strokeWidth="2.5" />
          {/* Rent Megaphone */}
          <polygon points="18,28 36,18 36,46 18,36" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
          <rect x="14" y="28" width="6" height="8" rx="1" fill="#ca8a04" />
          <path d="M 42 24 C 46 28 46 36 42 40" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
          <path d="M 46 20 C 52 26 52 38 46 44" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
};
