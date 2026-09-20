// MutantChess Official Brand Logo
// Dynamic theme-adaptive design with authentic chess Knight emblem
'use client';

import React from 'react';

export default function Logo({
  size = 'md',
  showText = true,
  className = '',
}) {
  const sizeMap = {
    sm: {
      emblem: 'w-7 h-7 rounded-sm',
      svg: 'w-4.5 h-4.5',
      text: 'text-base',
    },
    md: {
      emblem: 'w-8 h-8 rounded-sm',
      svg: 'w-5 h-5',
      text: 'text-lg',
    },
    lg: {
      emblem: 'w-10 h-10 rounded-sm',
      svg: 'w-6.5 h-6.5',
      text: 'text-xl',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Theme-Adaptive Emblem */}
      <div
        className={`relative flex items-center justify-center shrink-0 bg-theme-accent group-hover:scale-105 transition-transform duration-200 ${currentSize.emblem}`}
      >
        <svg
          viewBox="0 0 45 45"
          className={`${currentSize.svg} select-none`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Classic Chess Knight - adapts with theme accent */}
          <g
            fill="var(--theme-accent-text, #ffffff)"
            stroke="var(--theme-accent-text, #ffffff)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.02,5.08 20,5 C 20,5 20.28,6.5 21,7 C 21.72,7.5 22,10 22,10 z" />
            <circle cx="9.5" cy="25.5" r="1.1" fill="var(--theme-accent)" stroke="none" />
            <path
              d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
              transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
              fill="var(--theme-accent)"
              stroke="none"
            />
          </g>
        </svg>
      </div>

      {/* Theme-Adaptive Typography */}
      {showText && (
        <div className="flex items-center leading-none">
          <span className={`font-extrabold tracking-tight text-white ${currentSize.text}`}>
            Mutant<span className="text-theme-accent transition-colors ml-0.5">Chess</span>
          </span>
        </div>
      )}
    </div>
  );
}
