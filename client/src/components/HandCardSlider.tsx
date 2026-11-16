import React, { useRef, useState, useEffect } from 'react';
import { Card } from '../../../shared/types';
import { CardView } from './CardView';

interface HandCardSliderProps {
  cards: Card[];
  isMyTurn: boolean;
  onPlayCard: (card: Card) => void;
  onBankCard: (card: Card) => void;
}

export const HandCardSlider: React.FC<HandCardSliderProps> = ({
  cards,
  isMyTurn,
  onPlayCard,
  onBankCard,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const updateScrollBounds = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setScrollLeft(scrollLeft);
      setMaxScroll(Math.max(0, scrollWidth - clientWidth));
    }
  };

  useEffect(() => {
    updateScrollBounds();
    const handleResize = () => updateScrollBounds();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cards.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      setScrollLeft(scrollRef.current.scrollLeft);
      setMaxScroll(Math.max(0, scrollRef.current.scrollWidth - scrollRef.current.clientWidth));
    }
  };

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollLeft(val);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = val;
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Slider Controls Header */}
      <div className="w-full flex items-center justify-between px-2 mb-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-heading font-black text-amber-400 text-xs tracking-wider uppercase">
            YOUR HAND ({cards.length} {cards.length === 1 ? 'card' : 'cards'})
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {cards.length > 7 ? '⚠️ Hand limit is 7' : 'Max limit: 7'}
          </span>
        </div>

        {/* Navigation Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByAmount(-220)}
            disabled={scrollLeft <= 5}
            className="w-7 h-7 rounded-lg bg-black/60 hover:bg-amber-500/20 text-amber-300 disabled:opacity-30 disabled:pointer-events-none border border-[#1f4d36] flex items-center justify-center font-bold text-sm transition-all shadow"
            title="Scroll cards left"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(220)}
            disabled={scrollLeft >= maxScroll - 5}
            className="w-7 h-7 rounded-lg bg-black/60 hover:bg-amber-500/20 text-amber-300 disabled:opacity-30 disabled:pointer-events-none border border-[#1f4d36] flex items-center justify-center font-bold text-sm transition-all shadow"
            title="Scroll cards right"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Horizontal Cards Rail with Smooth Scroll */}
      <div className="relative w-full">
        {/* Left Fade Gradient when scrollable */}
        {scrollLeft > 10 && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0b2318] to-transparent z-20 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full overflow-x-auto flex items-end pt-5 pb-3 px-3 scroll-smooth scrollbar-thin select-none"
          style={{
            scrollSnapType: 'x mandatory',
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex-shrink-0 transition-all duration-200 transform hover:-translate-y-4 hover:scale-105 hover:z-30 mr-2.5 last:mr-0"
              style={{
                scrollSnapAlign: 'start',
              }}
            >
              <CardView
                card={card}
                size="md"
                isPlayable={isMyTurn}
                onPlay={() => onPlayCard(card)}
                onBank={() => onBankCard(card)}
              />
            </div>
          ))}
        </div>

        {/* Right Fade Gradient when more cards available */}
        {scrollLeft < maxScroll - 10 && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0b2318] to-transparent z-20 pointer-events-none" />
        )}
      </div>

      {/* Interactive Range Slider Track (requested by user) */}
      <div className="w-full flex items-center justify-between px-3 mt-1 gap-3">
        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider hidden sm:inline">
          HOVER TO PEEK • CLICK TO PLAY
        </span>

        {maxScroll > 15 && (
          <div className="flex-1 max-w-xs flex items-center gap-2 mx-auto">
            <span className="text-[9px] text-slate-400 font-mono">◀</span>
            <input
              type="range"
              min={0}
              max={maxScroll}
              value={scrollLeft}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
              title="Slide across cards in your hand"
            />
            <span className="text-[9px] text-slate-400 font-mono">▶</span>
          </div>
        )}

        <span className="text-[10px] text-amber-300 font-mono font-bold">
          {cards.length} cards in hand
        </span>
      </div>
    </div>
  );
};
