// Authentic Chess.com style Move Classification Vector Icons
// Accurately rendered to match moves_icons_hint.jpg
'use client';

import React from 'react';

export const CLASSIFICATION_CONFIG = {
  brilliant: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    bg: '#26c2a3',
    border: '#ffffff',
    text: '#ffffff',
  },
  great: {
    id: 'great',
    label: 'Great Move',
    symbol: '!',
    bg: '#418bf8',
    border: '#ffffff',
    text: '#ffffff',
  },
  best: {
    id: 'best',
    label: 'Best Move',
    symbol: '★',
    bg: '#7fa650',
    border: '#ffffff',
    text: '#ffffff',
  },
  excellent: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '👍',
    bg: '#98bc52',
    border: '#ffffff',
    text: '#ffffff',
  },
  good: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    bg: '#8ba86d',
    border: '#ffffff',
    text: '#ffffff',
  },
  book: {
    id: 'book',
    label: 'Book Move',
    symbol: '📖',
    bg: '#c87a4b',
    border: '#ffffff',
    text: '#ffffff',
  },
  inaccuracy: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    bg: '#f0c15c',
    border: '#ffffff',
    text: '#ffffff',
  },
  mistake: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    bg: '#f5a623',
    border: '#ffffff',
    text: '#ffffff',
  },
  miss: {
    id: 'miss',
    label: 'Miss',
    symbol: '✕',
    bg: '#db4f48',
    border: '#ffffff',
    text: '#ffffff',
  },
  blunder: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    bg: '#e03b3b',
    border: '#ffffff',
    text: '#ffffff',
  },
  forced: {
    id: 'forced',
    label: 'Forced',
    symbol: '➔',
    bg: '#6b7280',
    border: '#ffffff',
    text: '#ffffff',
  },
};

function renderSvgIcon(id) {
  switch (id) {
    case 'brilliant':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="#ffffff">
          {/* Left ! */}
          <rect x="6.8" y="4.5" width="3.4" height="8.8" rx="0.9" />
          <rect x="6.8" y="15.2" width="3.4" height="3.4" rx="0.9" />
          {/* Right ! */}
          <rect x="13.8" y="4.5" width="3.4" height="8.8" rx="0.9" />
          <rect x="13.8" y="15.2" width="3.4" height="3.4" rx="0.9" />
        </svg>
      );

    case 'great':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="#ffffff">
          <rect x="9.7" y="4.5" width="4.6" height="9.4" rx="1.1" />
          <rect x="9.7" y="15.5" width="4.6" height="4.6" rx="1.1" />
        </svg>
      );

    case 'best':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="#ffffff" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round">
          <polygon points="12,3.8 14.7,9.3 20.6,9.8 16.2,14.0 17.6,19.8 12,16.6 6.4,19.8 7.8,14.0 3.4,9.8 9.3,9.3" />
        </svg>
      );

    case 'book':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="#ffffff" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
          {/* Left page */}
          <path d="M 4.2 6.5 C 6.5 6.2 9 7.0 11 8.2 L 11 18.5 C 9 17.3 6.5 16.5 4.2 16.8 Z" />
          {/* Right page */}
          <path d="M 19.8 6.5 C 17.5 6.2 15 7.0 13 8.2 L 13 18.5 C 15 17.3 17.5 16.5 19.8 16.8 Z" />
        </svg>
      );

    case 'blunder':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {/* Left ? */}
          <path
            d="M 5.8 7.6 C 5.8 5.2 7.0 4.2 8.6 4.2 C 10.2 4.2 11.4 5.3 11.4 6.8 C 11.4 8.0 10.6 8.9 9.6 9.7 C 8.8 10.4 8.6 11.2 8.6 12.3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="7.3" y="15.2" width="2.6" height="2.6" rx="0.6" fill="#ffffff" />
          {/* Right ? */}
          <path
            d="M 12.6 7.6 C 12.6 5.2 13.8 4.2 15.4 4.2 C 17.0 4.2 18.2 5.3 18.2 6.8 C 18.2 8.0 17.4 8.9 16.4 9.7 C 15.6 10.4 15.4 11.2 15.4 12.3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="14.1" y="15.2" width="2.6" height="2.6" rx="0.6" fill="#ffffff" />
        </svg>
      );

    case 'mistake':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            d="M 8.2 8.2 C 8.2 5.2 9.8 4.2 12.0 4.2 C 14.2 4.2 15.8 5.4 15.8 7.4 C 15.8 9.0 14.7 10.1 13.5 11.1 C 12.4 12.0 12.0 12.8 12.0 14.0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="10.3" y="16.0" width="3.4" height="3.4" rx="0.8" fill="#ffffff" />
        </svg>
      );

    case 'inaccuracy':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {/* Left ? */}
          <path
            d="M 6.2 7.6 C 6.2 5.2 7.4 4.2 9.0 4.2 C 10.6 4.2 11.8 5.3 11.8 6.8 C 11.8 8.0 11.0 8.9 10.0 9.7 C 9.2 10.4 9.0 11.2 9.0 12.3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect x="7.7" y="15.2" width="2.6" height="2.6" rx="0.6" fill="#ffffff" />
          {/* Right ! */}
          <rect x="14.2" y="4.5" width="2.8" height="9.0" rx="0.7" fill="#ffffff" />
          <rect x="14.2" y="15.2" width="2.8" height="2.8" rx="0.7" fill="#ffffff" />
        </svg>
      );

    case 'miss':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      );

    case 'excellent':
      return (
        <svg
          viewBox="-2.5 -2.5 29 29"
          className="w-full h-full"
          fill="#ffffff"
        >
          <path d="M2 20h4V9H2v11zm20-10.5c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.8 7.37c-.37.37-.8.87-.8 1.43v10.4c0 .99.81 1.8 1.8 1.8h9.2c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2.43z" />
        </svg>
      );

    case 'good':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5.5 12.5 9.8 16.8 18.5 8" />
        </svg>
      );

    case 'forced':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4.5" y1="12" x2="18.5" y2="12" />
          <polyline points="13 6.5 18.5 12 13 17.5" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="#ffffff">
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

export default function ClassificationIcon({
  classification,
  size = 20,
  className = '',
  showTooltip = false,
}) {
  if (!classification) return null;

  const rawId = typeof classification === 'string'
    ? classification
    : (classification.id || classification.name || classification.label || '');

  const id = rawId.toString().toLowerCase().trim();
  const cfg = CLASSIFICATION_CONFIG[id] || CLASSIFICATION_CONFIG.good;

  const sizeStyle = typeof size === 'number'
    ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
    : { width: size, height: size };

  // Reduced slim white border matching user request
  const borderWidth = typeof size === 'number' && size < 24 ? '1px' : '1.2px';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white shrink-0 select-none ${className}`}
      style={{
        ...sizeStyle,
        backgroundColor: cfg.bg,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.45)',
        border: `${borderWidth} solid #ffffff`,
      }}
      title={showTooltip ? cfg.label : undefined}
    >
      <div
        style={{ width: '76%', height: '76%' }}
        className="flex items-center justify-center filter drop-shadow-[0_1.2px_0.8px_rgba(0,0,0,0.55)]"
      >
        {renderSvgIcon(id)}
      </div>
    </div>
  );
}
