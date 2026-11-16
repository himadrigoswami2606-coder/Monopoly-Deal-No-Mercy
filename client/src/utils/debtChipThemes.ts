// ============================================================================
// Monopoly Deal: No Mercy — 6 Distinct Debt Chip Color Themes (Point 10)
// ============================================================================

export interface DebtChipTheme {
  name: string;
  gradient: string;
  border: string;
  ring: string;
  text: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export const DEBT_CHIP_THEMES: DebtChipTheme[] = [
  // 0: Amber / Gold
  {
    name: 'Gold',
    gradient: 'bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600',
    border: 'border-amber-300',
    ring: 'ring-amber-400',
    text: 'text-amber-950',
    glow: 'shadow-amber-500/50',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    dotColor: '#f59e0b',
  },
  // 1: Cobalt Blue
  {
    name: 'Blue',
    gradient: 'bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800',
    border: 'border-blue-300',
    ring: 'ring-blue-400',
    text: 'text-white',
    glow: 'shadow-blue-500/50',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    dotColor: '#3b82f6',
  },
  // 2: Emerald Green
  {
    name: 'Green',
    gradient: 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800',
    border: 'border-emerald-300',
    ring: 'ring-emerald-400',
    text: 'text-white',
    glow: 'shadow-emerald-500/50',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    dotColor: '#10b981',
  },
  // 3: Crimson Red
  {
    name: 'Red',
    gradient: 'bg-gradient-to-br from-rose-400 via-rose-600 to-red-800',
    border: 'border-rose-300',
    ring: 'ring-rose-400',
    text: 'text-white',
    glow: 'shadow-rose-500/50',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    dotColor: '#ef4444',
  },
  // 4: Royal Purple
  {
    name: 'Purple',
    gradient: 'bg-gradient-to-br from-purple-400 via-purple-600 to-violet-800',
    border: 'border-purple-300',
    ring: 'ring-purple-400',
    text: 'text-white',
    glow: 'shadow-purple-500/50',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    dotColor: '#8b5cf6',
  },
  // 5: Bright Cyan
  {
    name: 'Cyan',
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-700',
    border: 'border-cyan-300',
    ring: 'ring-cyan-400',
    text: 'text-slate-950',
    glow: 'shadow-cyan-500/50',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    dotColor: '#06b6d4',
  },
];

export function getDebtChipTheme(colorIndex: number): DebtChipTheme {
  return DEBT_CHIP_THEMES[Math.abs(colorIndex) % DEBT_CHIP_THEMES.length];
}
