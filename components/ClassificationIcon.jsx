// Authentic Chess.com style Move Classification Vector Icons
'use client';

import React from 'react';

export const CLASSIFICATION_CONFIG = {
  brilliant: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    bg: '#1baca6',
    border: '#5eead4',
    text: '#ffffff',
  },
  great: {
    id: 'great',
    label: 'Great',
    symbol: '!',
    bg: '#5c8bb0',
    border: '#93c5fd',
    text: '#ffffff',
  },
  best: {
    id: 'best',
    label: 'Best',
    symbol: '★',
    bg: '#81b64c',
    border: '#86efac',
    text: '#ffffff',
  },
  excellent: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '✓',
    bg: '#96bc4b',
    border: '#bef264',
    text: '#ffffff',
  },
  good: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    bg: '#96af8b',
    border: '#cbd5e1',
    text: '#ffffff',
  },
  book: {
    id: 'book',
    label: 'Book',
    symbol: '📖',
    bg: '#a88865',
    border: '#fde68a',
    text: '#ffffff',
  },
  inaccuracy: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    bg: '#f0c15c',
    border: '#fef08a',
    text: '#ffffff',
  },
  mistake: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    bg: '#e6912c',
    border: '#fed7aa',
    text: '#ffffff',
  },
  miss: {
    id: 'miss',
    label: 'Miss',
    symbol: '✕',
    bg: '#db4f48',
    border: '#fecaca',
    text: '#ffffff',
  },
  blunder: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    bg: '#ca3431',
    border: '#fca5a5',
    text: '#ffffff',
  },
  forced: {
    id: 'forced',
    label: 'Forced',
    symbol: '➔',
    bg: '#6b7280',
    border: '#cbd5e1',
    text: '#ffffff',
  },
};

function renderSvgIcon(id) {
  switch (id) {
    case 'brilliant':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          {/* Left ! */}
          <path d="M8.2 4.2h1.9l-.3 8.2H8.5L8.2 4.2zM9.1 15.2a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7z" />
          {/* Right ! */}
          <path d="M13.9 4.2h1.9l-.3 8.2h-1.6l-.3-8.2zM14.8 15.2a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7z" />
        </svg>
      );

    case 'great':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M10.8 4.2h2.4l-.4 9.2h-1.6l-.4-9.2zM12 16.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
        </svg>
      );

    case 'best':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8 6.9 19.5l1-5.7-4.1-4 5.7-.8L12 3.8z" />
        </svg>
      );

    case 'excellent':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5.5 12.5 9.5 16.5 18.5 7.5" />
        </svg>
      );

    case 'good':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 12.5 10 16.5 18 8" />
        </svg>
      );

    case 'book':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M4 6.2A2.2 2.2 0 0 1 6.2 4h4.6c.4 0 .7.3.7.7v13.6c0 .4-.3.7-.7.7H6.2A2.2 2.2 0 0 0 4 21.2V6.2zm16 0a2.2 2.2 0 0 0-2.2-2.2h-4.6a.7.7 0 0 0-.7.7v13.6c0 .4.3.7.7.7h4.6a2.2 2.2 0 0 1 2.2 2.2V6.2z" />
        </svg>
      );

    case 'inaccuracy':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M8.2 6.5a2.7 2.7 0 0 1 2.7-2.7c1.5 0 2.7 1.1 2.7 2.5 0 1.1-.6 1.7-1.3 2.2-.6.4-.9.9-.9 1.7v.5h-1.6v-.5c0-1.1.5-1.8 1.2-2.3.5-.4 1-.8 1-1.4 0-.7-.5-1.2-1.1-1.2-.7 0-1.2.4-1.3 1.1L8.2 6.5zM9.8 13.5a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z" />
          <path d="M15 5.2h1.6l-.3 6.8h-1l-.3-6.8zM15.8 13.8a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z" />
        </svg>
      );

    case 'mistake':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M9.5 7.2a3.8 3.8 0 0 1 3.8-3.7c2.1 0 3.8 1.5 3.8 3.5 0 1.5-.9 2.5-1.9 3.2-.8.6-1.3 1.3-1.3 2.4v.6h-2.2v-.6c0-1.5.8-2.5 1.8-3.2.8-.5 1.4-1.1 1.4-2.1 0-1-.7-1.7-1.6-1.7-1 0-1.7.7-1.9 1.5L9.5 7.2zM12 16.8a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" />
        </svg>
      );

    case 'miss':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      );

    case 'blunder':
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M6 7a2.6 2.6 0 0 1 2.6-2.6c1.4 0 2.6 1 2.6 2.4 0 1.1-.6 1.7-1.3 2.2-.6.5-1 1-1 1.7v.5h-1.5v-.5c0-1.1.5-1.7 1.2-2.2.5-.4.9-.8.9-1.4 0-.7-.5-1.1-1.1-1.1-.7 0-1.2.4-1.3 1.1L6 7zM8.1 14.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
          <path d="M12.8 7a2.6 2.6 0 0 1 2.6-2.6c1.4 0 2.6 1 2.6 2.4 0 1.1-.6 1.7-1.3 2.2-.6.5-1 1-1 1.7v.5h-1.5v-.5c0-1.1.5-1.7 1.2-2.2.5-.4.9-.8.9-1.4 0-.7-.5-1.1-1.1-1.1-.7 0-1.2.4-1.3 1.1l-1.1-.1zM14.9 14.2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
        </svg>
      );

    case 'forced':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
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

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white shrink-0 select-none ${className}`}
      style={{
        ...sizeStyle,
        backgroundColor: cfg.bg,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.45)',
        border: `1.5px solid ${cfg.border}80`,
      }}
      title={showTooltip ? cfg.label : undefined}
    >
      <div style={{ width: '64%', height: '64%' }} className="flex items-center justify-center">
        {renderSvgIcon(id)}
      </div>
    </div>
  );
}
