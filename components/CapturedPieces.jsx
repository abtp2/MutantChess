// Displays captured chess pieces and material difference for both players (Lichess style)
import React from 'react';
import { ChessPiece } from '../lib/chessPieces';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

export default function CapturedPieces({
  whiteCaptured = [],
  blackCaptured = [],
  captured = [],
  playerColor = 'w',
}) {
  // Support both (whiteCaptured + blackCaptured) and legacy single (captured)
  let myCaptured = [];
  let enemyCaptured = [];

  if (whiteCaptured.length > 0 || blackCaptured.length > 0) {
    if (playerColor === 'w') {
      myCaptured = whiteCaptured; // Black pieces captured by White
      enemyCaptured = blackCaptured; // White pieces captured by Black
    } else {
      myCaptured = blackCaptured; // White pieces captured by Black
      enemyCaptured = whiteCaptured; // Black pieces captured by White
    }
  } else if (captured.length > 0) {
    myCaptured = captured;
    enemyCaptured = [];
  }

  // Count piece types captured by me and opponent
  const myCounts = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  const enemyCounts = { q: 0, r: 0, b: 0, n: 0, p: 0 };

  myCaptured.forEach((p) => {
    if (myCounts[p.type] !== undefined) myCounts[p.type]++;
  });
  enemyCaptured.forEach((p) => {
    if (enemyCounts[p.type] !== undefined) enemyCounts[p.type]++;
  });

  // Calculate Lichess-style piece difference (only net surplus pieces are shown)
  const pieceDifference = {};
  PIECE_ORDER.forEach((type) => {
    const diff = myCounts[type] - enemyCounts[type];
    pieceDifference[type] = Math.max(0, diff);
  });

  // Calculate total material score difference
  const myTotalScore = Object.keys(myCounts).reduce(
    (sum, t) => sum + myCounts[t] * (PIECE_VALUES[t] || 0),
    0
  );
  const enemyTotalScore = Object.keys(enemyCounts).reduce(
    (sum, t) => sum + enemyCounts[t] * (PIECE_VALUES[t] || 0),
    0
  );
  const pointsAhead = myTotalScore - enemyTotalScore;

  // The piece color displayed is the captured enemy piece color
  const displayPieceColor = playerColor === 'w' ? 'b' : 'w';

  const hasAnyPieces = PIECE_ORDER.some((t) => pieceDifference[t] > 0);

  if (!hasAnyPieces && pointsAhead <= 0) {
    return <div className="h-4 select-none" />;
  }

  return (
    <div className="flex items-center gap-1.5 h-5 select-none mt-0.5">
      <div className="flex items-center -space-x-1">
        {PIECE_ORDER.map((type) => {
          const count = pieceDifference[type];
          if (!count) return null;
          return (
            <div key={type} className="flex items-center">
              {Array.from({ length: count }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform hover:scale-110 ${
                    displayPieceColor === 'b'
                      ? 'filter drop-shadow-[0_0_1.5px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                      : 'filter drop-shadow-[0_0_1.5px_rgba(0,0,0,0.9)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                  }`}
                  title={`${count} ${type.toUpperCase()}`}
                >
                  <ChessPiece type={type} color={displayPieceColor} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {pointsAhead > 0 && (
        <span className="text-xs font-bold text-theme-sec font-mono ml-0.5">
          +{pointsAhead}
        </span>
      )}
    </div>
  );
}
