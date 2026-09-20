// Comprehensive Chess Openings Database & Book Detection
// Combines data/openings.json (3,400+ named variations) with ECO mainlines
import rawOpenings from '../data/openings.json' with { type: 'json' };

export const OPENINGS = [
  { name: "Ruy Lopez: Cozio Defense", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8e7"] },
  { name: "Ruy Lopez: Berlin Defense", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"] },
  { name: "Ruy Lopez: Morphy Defense", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"] },
  { name: "Ruy Lopez", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { name: "Italian Game: Giuoco Piano", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"] },
  { name: "Italian Game: Two Knights Defense", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"] },
  { name: "Italian Game", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { name: "Scotch Game", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"] },
  { name: "Vienna Game", uci: ["e2e4", "e7e5", "b1c3"] },
  { name: "King's Gambit", uci: ["e2e4", "e7e5", "f2f4"] },
  { name: "Open Game", uci: ["e2e4", "e7e5"] },
  { name: "Sicilian Defense: Najdorf", uci: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"] },
  { name: "Sicilian Defense: Dragon", uci: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "g7g6"] },
  { name: "Sicilian Defense: Classical", uci: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "b8c6"] },
  { name: "Sicilian Defense: Alapin", uci: ["e2e4", "c7c5", "c2c3"] },
  { name: "Sicilian Defense: Open", uci: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4"] },
  { name: "Sicilian Defense", uci: ["e2e4", "c7c5"] },
  { name: "French Defense: Winawer", uci: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "f8b4"] },
  { name: "French Defense: Classical", uci: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"] },
  { name: "French Defense: Advance", uci: ["e2e4", "e7e6", "d2d4", "d7d5", "e4e5"] },
  { name: "French Defense", uci: ["e2e4", "e7e6"] },
  { name: "Caro-Kann Defense: Advance", uci: ["e2e4", "c7c6", "d2d4", "d7d5", "e4e5"] },
  { name: "Caro-Kann Defense: Classical", uci: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4"] },
  { name: "Caro-Kann Defense", uci: ["e2e4", "c7c6"] },
  { name: "Scandinavian Defense: Modern", uci: ["e2e4", "d7d5", "e4d5", "g8f6"] },
  { name: "Scandinavian Defense", uci: ["e2e4", "d7d5"] },
  { name: "Pirc Defense", uci: ["e2e4", "d7d6", "d2d4", "g8f6"] },
  { name: "Alekhine's Defense", uci: ["e2e4", "g8f6"] },
  { name: "King's Pawn Opening", uci: ["e2e4"] },
  { name: "London System", uci: ["d2d4", "d7d5", "c1f4"] },
  { name: "Queen's Gambit Declined", uci: ["d2d4", "d7d5", "c2c4", "e7e6"] },
  { name: "Queen's Gambit Accepted", uci: ["d2d4", "d7d5", "c2c4", "d5c4"] },
  { name: "Slav Defense", uci: ["d2d4", "d7d5", "c2c4", "c7c6"] },
  { name: "Queen's Gambit", uci: ["d2d4", "d7d5", "c2c4"] },
  { name: "King's Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "g7g6"] },
  { name: "Grünfeld Defense", uci: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5"] },
  { name: "Nimzo-Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"] },
  { name: "Queen's Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3", "b7b6"] },
  { name: "Bogo-Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "e7e6", "g1f3", "f8b4"] },
  { name: "Dutch Defense", uci: ["d2d4", "f7f5"] },
  { name: "Queen's Pawn Opening", uci: ["d2d4"] },
  { name: "English Opening: Symmetrical", uci: ["c2c4", "c7c5"] },
  { name: "English Opening", uci: ["c2c4"] },
  { name: "Réti Opening", uci: ["g1f3", "d7d5", "c2c4"] },
  { name: "King's Indian Attack", uci: ["g1f3", "d7d5", "g2g3"] },
];

// Build high-performance lookup structures for openings database
const fenToOpeningMap = new Map();
const prefixFenMap = new Map();

for (const op of rawOpenings) {
  if (op.fen) {
    if (!fenToOpeningMap.has(op.fen)) {
      fenToOpeningMap.set(op.fen, op.name);
    }
    const baseFen = op.fen.split(' ').slice(0, 3).join(' ');
    if (!prefixFenMap.has(baseFen)) {
      prefixFenMap.set(baseFen, op.name);
    }
  }
}

// Find opening name by FEN directly
export function getOpeningFromFen(fen) {
  if (!fen) return null;
  if (fenToOpeningMap.has(fen)) return fenToOpeningMap.get(fen);

  const baseFen = fen.split(' ').slice(0, 3).join(' ');
  if (prefixFenMap.has(baseFen)) return prefixFenMap.get(baseFen);

  // Substring match fallback matching analysis.ts
  const rawMatch = rawOpenings.find((o) => fen.includes(o.fen));
  if (rawMatch) return rawMatch.name;

  return null;
}

// Check if a move is within standard book theory
export function isBookMove(historyUci, moveIndex, currentFen = null) {
  if (moveIndex >= 22) return false;

  if (currentFen) {
    const directName = getOpeningFromFen(currentFen);
    if (directName) return true;
  }

  const currentPrefix = historyUci.slice(0, moveIndex + 1);
  return OPENINGS.some((opening) => {
    if (opening.uci.length < currentPrefix.length) return false;
    for (let i = 0; i < currentPrefix.length; i++) {
      if (opening.uci[i] !== currentPrefix[i]) return false;
    }
    return true;
  });
}

// Detect opening name given game history and latest FEN
export function detectOpeningName(historyUci, currentFen = null) {
  if (currentFen) {
    const fenMatch = getOpeningFromFen(currentFen);
    if (fenMatch) return fenMatch;
  }

  let longestMatch = null;
  let maxMatchedMoves = 0;

  for (const opening of OPENINGS) {
    if (opening.uci.length <= historyUci.length) {
      const match = opening.uci.every((move, idx) => historyUci[idx] === move);
      if (match && opening.uci.length > maxMatchedMoves) {
        maxMatchedMoves = opening.uci.length;
        longestMatch = opening.name;
      }
    }
  }

  return longestMatch || "Custom Opening";
}
