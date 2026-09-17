// Smooth vertical Evaluation Bar for MutantChess matching exact chessboard height
'use client';

import React from 'react';

export default function EvalBar({
  cp = 0,
  mate = null,
  isFlipped = false,
  height,
}) {
  // Calculate percentage for White:
  // cp = 0 => 50%
  // cp = +500 (or more) => ~90-95%
  // cp = -500 (or less) => ~5-10%
  let whitePercent = 50;

  if (mate !== null) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    // Sigmoid mapping for smooth scaling
    const normalized = Math.max(-1500, Math.min(1500, cp));
    whitePercent = 50 + (normalized / 1500) * 45;
    whitePercent = Math.max(4, Math.min(96, whitePercent));
  }

  // If board is flipped (Black at bottom), flip the eval bar orientation
  const displayWhiteBottom = !isFlipped;
  const bottomPercent = displayWhiteBottom ? whitePercent : (100 - whitePercent);

  // Text label to show
  let label = '0.0';
  if (mate !== null) {
    label = `M${Math.abs(mate)}`;
  } else {
    const pawns = (Math.abs(cp) / 100).toFixed(1);
    label = cp > 0 ? `+${pawns}` : cp < 0 ? `-${pawns}` : '0.0';
  }

  const heightStyle = height
    ? (typeof height === 'number' ? `${height}px` : height)
    : '100%';

  return (
    <div
      className="relative w-5 sm:w-6 rounded-xs overflow-hidden bg-[#181715] border border-theme-border flex flex-col justify-between select-none shrink-0 transition-all duration-150"
      style={{ height: heightStyle }}
    >
      {/* Top half indicator (Black if standard, White if flipped) */}
      <div 
        className="w-full bg-[#201e1b] transition-all duration-300 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - bottomPercent}%` }}
      >
        {bottomPercent < 50 && (
          <span className="text-[10px] font-mono font-bold text-gray-300 tracking-tighter">
            {label}
          </span>
        )}
      </div>

      {/* Subtle tick markers for tactical depth */}
      <div className="absolute top-[25%] left-0 right-0 h-[1px] bg-white/10 pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/30 pointer-events-none" />
      <div className="absolute top-[75%] left-0 right-0 h-[1px] bg-black/15 pointer-events-none" />

      {/* Equality label if dead level */}
      {bottomPercent === 50 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-mono font-bold text-gray-400">0.0</span>
        </div>
      )}

      {/* Bottom half indicator (White if standard, Black if flipped) */}
      <div 
        className="w-full bg-[#f1f1f1] transition-all duration-300 ease-out flex items-end justify-center pb-1"
        style={{ height: `${bottomPercent}%` }}
      >
        {bottomPercent > 50 && (
          <span className="text-[10px] font-mono font-bold text-gray-900 tracking-tighter">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

