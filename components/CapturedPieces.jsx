// Displays captured chess pieces and material difference for both players
import React from 'react';
import { ChessPiece } from '../lib/chessPieces';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

export default function CapturedPieces({ captured = [], playerColor = 'w' }) {
  // captured is an array of pieces captured by this player: e.g. [{ type: 'p', color: 'b' }]
  // calculate total points
  const points = captured.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);

  // Group pieces by type
  const grouped = {};
  PIECE_ORDER.forEach(t => { grouped[t] = 0; });
  captured.forEach(p => {
    if (grouped[p.type] !== undefined) grouped[p.type]++;
  });

  return (
    <div className="flex items-center gap-1.5 h-6 select-none">
      <div className="flex items-center -space-x-1.5">
        {PIECE_ORDER.map((type) => {
          const count = grouped[type];
          if (!count) return null;
          return (
            <div key={type} className="flex items-center">
              {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="w-4 h-4 sm:w-5 sm:h-5 opacity-90 drop-shadow-sm">
                  {/* Enemy color was captured */}
                  <ChessPiece type={type} color={playerColor === 'w' ? 'b' : 'w'} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {points > 0 && (
        <span className="text-[11px] font-bold text-gray-400 font-mono ml-1">
          +{points}
        </span>
      )}
    </div>
  );
}
