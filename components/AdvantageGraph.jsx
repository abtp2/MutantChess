// Interactive SVG Advantage Evaluation Graph for MutantChess (Chess.com / ChessDream style)
'use client';

import React, { useRef } from 'react';

export default function AdvantageGraph({
  evaluations = [],
  classifiedMoves = [],
  currentStep = -1,
  onSelectStep,
}) {
  const containerRef = useRef(null);

  if (!evaluations || evaluations.length < 2) {
    return (
      <div className="h-14 bg-theme-sub rounded-sm border border-theme-border flex items-center justify-center text-xs text-theme-muted font-mono select-none">
        Advantage graph will appear after game review.
      </div>
    );
  }

  const totalPoints = evaluations.length;
  const svgWidth = 1000;
  const svgHeight = 64;
  const zeroY = svgHeight / 2; // y=32 is 0.0 equality

  // Map centipawns to y coordinate (clamp ±1000 cp = ±10 pawns)
  const getY = (cp) => {
    const clamped = Math.max(-1000, Math.min(1000, cp || 0));
    // cp > 0 (White advantage) goes UP (smaller y)
    return zeroY - (clamped / 1000) * (zeroY - 4);
  };

  // Build SVG polyline points
  const points = evaluations.map((ev, i) => {
    const x = (i / (totalPoints - 1)) * svgWidth;
    const y = getY(ev.whiteCp || 0);
    return { x, y, ev, index: i - 1 };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Fill area between line and baseline
  const areaD = `${pathD} L ${svgWidth},${zeroY} L 0,${zeroY} Z`;

  // Current active step cursor position
  const activePointIndex = Math.max(0, Math.min(totalPoints - 1, currentStep + 1));
  const activeX = points[activePointIndex] ? points[activePointIndex].x : 0;
  const activeY = points[activePointIndex] ? points[activePointIndex].y : zeroY;

  const handleClick = (e) => {
    if (!containerRef.current || !onSelectStep) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetEvalIndex = Math.round(ratio * (totalPoints - 1));
    const targetMoveStep = targetEvalIndex - 1;
    onSelectStep(targetMoveStep);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      title="Click anywhere to jump to that move"
      className="relative w-full h-16 bg-[#161513] rounded-sm border border-theme-border overflow-hidden cursor-pointer select-none group shadow-inner"
    >
      {/* Zero equality reference line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 pointer-events-none" />

      {/* Advantage indicators */}
      <div className="absolute top-1 left-2 text-[9px] font-mono font-bold text-gray-400 pointer-events-none">
        +White
      </div>
      <div className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-gray-500 pointer-events-none">
        +Black
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Advantage Area */}
        <path d={areaD} fill="rgba(255, 255, 255, 0.08)" />

        {/* Curve Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Critical Move Badges (Blunders, Brilliants, Misses) */}
        {classifiedMoves.map((m, idx) => {
          const pt = points[idx + 1];
          if (!pt) return null;
          const id = m.classification?.id;
          if (id === 'blunder') {
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#ef4444"
                stroke="#000000"
                strokeWidth="1.5"
              />
            );
          }
          if (id === 'brilliant') {
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#06b6d4"
                stroke="#000000"
                strokeWidth="1.5"
              />
            );
          }
          if (id === 'miss') {
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#ec4899"
                stroke="#000000"
                strokeWidth="1.5"
              />
            );
          }
          return null;
        })}

        {/* Active Move Cursor */}
        <line
          x1={activeX}
          y1={0}
          x2={activeX}
          y2={svgHeight}
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeDasharray="3 2"
        />
        <circle
          cx={activeX}
          cy={activeY}
          r="5"
          fill="#38bdf8"
          stroke="#ffffff"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
