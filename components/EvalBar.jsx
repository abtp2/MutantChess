// Smooth vertical Evaluation Bar for MutantChess matching exact chessboard height
'use client';

import React from 'react';

function EvalBarComponent({
  cp = 0,
  mate = null,
  isFlipped = false,
  height,
}) {
  const safeCp = typeof cp === 'number' && !isNaN(cp) ? cp : 0;
  const safeMate = typeof mate === 'number' && !isNaN(mate) ? mate : null;

  // Calculate percentage for White:
  // cp = 0 => 50%
  // cp = +300 => ~75%
  // cp = +500 => ~86%
  // cp = -500 => ~14%
  let whitePercent = 50;

  if (safeMate !== null) {
    if (safeMate > 0) {
      whitePercent = 100;
    } else if (safeMate < 0) {
      whitePercent = 0;
    } else {
      whitePercent = 50;
    }
  } else {
    // Authentic chess winning probability sigmoid (Lichess/Chess.com curve)
    const winProb = 1 / (1 + Math.exp(-0.00368208 * safeCp));
    whitePercent = winProb * 100;
    // Keep a minimum strip visible so both bars remain visible and text has room
    whitePercent = Math.max(3.5, Math.min(96.5, whitePercent));
  }

  // Board orientation:
  // When isFlipped is false: White is at bottom, Black is at top
  // When isFlipped is true: White is at top, Black is at bottom
  const topIsWhite = Boolean(isFlipped);

  // Determine which side is winning:
  // > 50.5% => White advantage
  // < 49.5% => Black advantage
  // Otherwise => Equal position (0.0)
  const isWhiteWinning = whitePercent > 50.5;
  const isBlackWinning = whitePercent < 49.5;
  const isDeadEqual = !isWhiteWinning && !isBlackWinning;

  // Whichever side has advantage gets the label on their bar
  // Top gets label if: (White winning AND top is White) OR (Black winning AND top is Black)
  const showTopLabel = (isWhiteWinning && topIsWhite) || (isBlackWinning && !topIsWhite);
  // Bottom gets label if: (White winning AND bottom is White) OR (Black winning AND bottom is Black)
  const showBottomLabel = (isWhiteWinning && !topIsWhite) || (isBlackWinning && topIsWhite);

  // Formatted score text
  let label = '0.0';
  if (safeMate !== null) {
    label = `M${Math.abs(safeMate)}`;
  } else {
    const pawns = (Math.abs(safeCp) / 100).toFixed(1);
    if (pawns === '0.0') {
      label = '0.0';
    } else if (safeCp > 0) {
      label = `+${pawns}`;
    } else {
      label = `-${pawns}`;
    }
  }

  const heightStyle = height
    ? (typeof height === 'number' ? `${height}px` : height)
    : '100%';

  return (
    <div
      className="relative w-6 sm:w-7 overflow-hidden bg-[#201e1b] border-r border-white/10 select-none shrink-0 self-stretch z-10"
      style={{ height: heightStyle, minHeight: '100%' }}
    >
      {/* White bar filling whitePercent% from top or bottom */}
      <div
        className={`absolute left-0 right-0 bg-[#f1f1f1] transition-all duration-300 ease-out pointer-events-none ${
          topIsWhite ? 'top-0' : 'bottom-0'
        }`}
        style={{ height: `${whitePercent}%` }}
      />

      {/* Tactical depth marker lines */}
      <div className="absolute top-[25%] left-0 right-0 h-[1px] bg-white/10 pointer-events-none z-10" />
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 pointer-events-none z-10" />
      <div className="absolute top-[75%] left-0 right-0 h-[1px] bg-black/20 pointer-events-none z-10" />

      {/* Top score label */}
      {showTopLabel && (
        <div className="absolute top-1.5 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <span
            className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-tighter leading-none px-0.5 ${
              topIsWhite ? 'text-[#111827]' : 'text-[#e5e7eb]'
            }`}
          >
            {label}
          </span>
        </div>
      )}

      {/* Equality badge if dead level */}
      {isDeadEqual && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-[9px] font-mono font-bold text-gray-300 bg-black/60 px-1 py-0.5 rounded-[2px] leading-none">
            0.0
          </span>
        </div>
      )}

      {/* Bottom score label */}
      {showBottomLabel && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <span
            className={`text-[10px] sm:text-[11px] font-mono font-bold tracking-tighter leading-none px-0.5 ${
              topIsWhite ? 'text-[#e5e7eb]' : 'text-[#111827]'
            }`}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

const EvalBar = React.memo(EvalBarComponent);
export default EvalBar;
