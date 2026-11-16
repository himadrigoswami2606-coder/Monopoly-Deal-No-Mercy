import React from 'react';
import { AISpeed } from '../../../shared/types';
import { sounds } from '../utils/audio';

interface AISettingsModalProps {
  currentSpeed: AISpeed;
  onSetSpeed: (speed: AISpeed) => void;
  onClose: () => void;
}

const SPEED_TIERS: {
  key: AISpeed;
  numeric: number;
  label: string;
  badge: string;
  icon: string;
  delayText: string;
  description: string;
}[] = [
  {
    key: 'FAST',
    numeric: 1,
    label: 'Fast / Blitz',
    badge: '~0.7s per play',
    icon: '⚡',
    delayText: '0.7s pause between cards',
    description: 'Rapid-fire turns with almost instant decisions. Best for quick testing.',
  },
  {
    key: 'NORMAL',
    numeric: 2,
    label: 'Normal Pace',
    badge: '~1.6s per play',
    icon: '⏱️',
    delayText: '1.6s pause between cards',
    description: 'Standard digital board game tempo. Smooth and steady.',
  },
  {
    key: 'REALISTIC',
    numeric: 3,
    label: 'Human-like (Recommended)',
    badge: '~2.6s per play',
    icon: '🧠',
    delayText: '2.6s thoughtful pause',
    description:
      'Simulates a real human opponent taking a moment to look at their hand, deliberate, and play.',
  },
  {
    key: 'SLOW',
    numeric: 4,
    label: 'Slow & Relaxed',
    badge: '~4.2s per play',
    icon: '🐢',
    delayText: '4.2s relaxed pause',
    description:
      'Generous pauses between every move. Plenty of time to inspect cards, read the log, and follow strategies.',
  },
];

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  currentSpeed,
  onSetSpeed,
  onClose,
}) => {
  const activeTier = SPEED_TIERS.find((t) => t.key === currentSpeed) || SPEED_TIERS[1];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const tier = SPEED_TIERS.find((t) => t.numeric === val);
    if (tier) {
      sounds.playCardSnap();
      onSetSpeed(tier.key);
    }
  };

  const handleSelectTier = (speed: AISpeed) => {
    sounds.playCardSnap();
    onSetSpeed(speed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full bg-[#0d2318] border-2 border-amber-400 rounded-3xl p-5 md:p-6 shadow-2xl text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1f4d36] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-heading font-black text-base md:text-lg uppercase tracking-wider text-amber-300">
                AI Bot Speed Tracker
              </h3>
              <p className="text-[11px] text-slate-300">
                Control the thinking pause and card-play speed of AI opponents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#184a32] hover:bg-[#236846] text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-colors border border-[#2d6a4f]"
          >
            ✕
          </button>
        </div>

        {/* Speed Slider Section */}
        <div className="bg-[#081a12] p-4 rounded-2xl border border-[#1f4d36] mb-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold uppercase tracking-wider text-slate-400">
              Current Speed:
            </span>
            <span className="font-heading font-black text-amber-400 text-sm flex items-center gap-1.5 bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-500/40">
              <span>{activeTier.icon}</span>
              <span>{activeTier.label}</span>
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="px-1 py-2">
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={activeTier.numeric}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 font-bold px-0.5">
              <span>⚡ Fast</span>
              <span>⏱️ Normal</span>
              <span>🧠 Human-like</span>
              <span>🐢 Relaxed</span>
            </div>
          </div>

          <div className="bg-[#0e2c1e] p-2.5 rounded-xl border border-[#1b4330] text-xs text-slate-200">
            <div className="font-bold text-emerald-300 text-xs mb-0.5 flex items-center gap-1">
              <span>✓</span>
              <span>{activeTier.delayText}</span>
            </div>
            <p className="text-[11px] text-slate-400">{activeTier.description}</p>
          </div>
        </div>

        {/* Clickable Speed Tier Cards */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] font-heading font-bold uppercase text-slate-400 tracking-wider">
            Or Choose A Preset:
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SPEED_TIERS.map((tier) => {
              const isSelected = tier.key === currentSpeed;
              return (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => handleSelectTier(tier.key)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : 'bg-[#081a12] border-[#1b3d2b] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{tier.icon}</span>
                    <span className="font-heading font-black text-xs uppercase text-slate-100 truncate">
                      {tier.label.split('/')[0].trim()}
                    </span>
                  </div>
                  <div className="text-[9.5px] font-mono font-bold text-amber-300">
                    {tier.badge}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#1f4d36] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-6 rounded-xl font-heading font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
