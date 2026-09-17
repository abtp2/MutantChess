// Professional Chess.com style Move History component
'use client';

import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function MoveHistory({
  moves = [],
  currentMoveIndex = -1,
  onSelectMove,
  onFirst,
  onPrev,
  onNext,
  onLast,
}) {
  const scrollContainerRef = useRef(null);
  const activeMoveRef = useRef(null);

  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: { move: moves[i], index: i },
      black: moves[i + 1] ? { move: moves[i + 1], index: i + 1 } : null,
    });
  }

  const renderMoveButton = (item) => {
    if (!item) return <div className="w-1/2" />;
    const { move, index } = item;
    const isCurrent = currentMoveIndex === index;
    const san = move.san || (move.from ? `${move.from}-${move.to}` : move);
    const classification = move.classification;

    return (
      <button
        ref={isCurrent ? activeMoveRef : null}
        onClick={() => onSelectMove(index)}
        className={`flex items-center justify-between px-2 py-1 rounded-xs text-xs font-mono font-medium transition-colors w-1/2 ${
          isCurrent
            ? 'bg-theme-btn text-white font-bold border-b-2 border-theme-accent'
            : 'text-theme-sec hover:bg-theme-sub hover:text-white'
        }`}
      >
        <span>{san}</span>
        {classification && (
          <span
            className="text-[10px] px-1 rounded-xs font-bold ml-1"
            style={{
              backgroundColor: classification.bg,
              color: classification.color,
            }}
            title={classification.label}
          >
            {classification.symbol}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-theme-panel rounded-sm border border-theme-border overflow-hidden select-none">
      {/* Header */}
      <div className="px-3 py-2 bg-theme-sidebar border-b border-theme-border flex items-center justify-between text-xs font-bold text-theme-muted uppercase tracking-wider">
        <span>Move List ({moves.length})</span>
      </div>

      {/* Move list */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-1 space-y-0.5 custom-scrollbar min-h-[140px]"
      >
        {pairs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-theme-muted italic p-4">
            Game moves will appear here.
          </div>
        ) : (
          pairs.map((pair) => (
            <div
              key={pair.number}
              className={`flex items-center rounded-xs text-xs py-0.5 px-1 ${
                pair.number % 2 === 0 ? 'bg-theme-sub' : 'bg-theme-panel'
              }`}
            >
              <span className="w-8 text-theme-muted font-mono font-semibold text-[11px] select-none">
                {pair.number}.
              </span>
              <div className="flex-1 flex gap-1">
                {renderMoveButton(pair.white)}
                {renderMoveButton(pair.black)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="p-1.5 bg-theme-sidebar border-t border-theme-border flex items-center justify-center gap-2">
        <button
          onClick={onFirst}
          title="First move"
          className="p-1.5 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-theme-sec hover:text-white border border-theme-border transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onPrev}
          title="Previous move"
          className="p-1.5 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-theme-sec hover:text-white border border-theme-border transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          title="Next move"
          className="p-1.5 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-theme-sec hover:text-white border border-theme-border transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onLast}
          title="Last move"
          className="p-1.5 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-theme-sec hover:text-white border border-theme-border transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
