// Classification definitions, WTF threshold algorithm, and tactical board helpers
// Ported from antigravity_helpers/classification.ts and board helpers into JavaScript
import { Chess } from 'chess.js';

export const Classification = {
  BRILLIANT: 'brilliant',
  GREAT: 'great',
  BEST: 'best',
  EXCELLENT: 'excellent',
  GOOD: 'good',
  INACCURACY: 'inaccuracy',
  MISTAKE: 'mistake',
  BLUNDER: 'blunder',
  BOOK: 'book',
  FORCED: 'forced',
  MISS: 'miss',
};

export const classificationValues = {
  blunder: 0,
  miss: 0.1,
  mistake: 0.2,
  inaccuracy: 0.4,
  good: 0.65,
  excellent: 0.9,
  best: 1,
  great: 1,
  brilliant: 1,
  book: 1,
  forced: 1,
};

// Classification types with no special rules (Centipawn Loss based)
export const centipawnClassifications = [
  Classification.BEST,
  Classification.EXCELLENT,
  Classification.GOOD,
  Classification.INACCURACY,
  Classification.MISTAKE,
  Classification.BLUNDER,
];

export const CLASSIFICATION_INFO = {
  brilliant: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    color: '#06b6d4',
    bg: '#083344',
    badge: 'cyan',
    icon: 'lightning',
    description: 'A brilliant sacrifice that maintains or creates a winning edge.',
  },
  great: {
    id: 'great',
    label: 'Great',
    symbol: '!',
    color: '#0ea5e9',
    bg: '#082f49',
    badge: 'sky',
    icon: 'sparkle',
    description: 'A critical move that finds the only winning or saving resource.',
  },
  best: {
    id: 'best',
    label: 'Best',
    symbol: '★',
    color: '#22c55e',
    bg: '#052e16',
    badge: 'green',
    icon: 'star',
    description: 'The best move in the position.',
  },
  excellent: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '★',
    color: '#84cc16',
    bg: '#1a2e05',
    badge: 'lime',
    icon: 'star',
    description: 'Almost as strong as the best move.',
  },
  good: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    color: '#a3e635',
    bg: '#142a04',
    badge: 'lime',
    icon: 'check',
    description: 'A solid, playable move.',
  },
  book: {
    id: 'book',
    label: 'Book',
    symbol: '📖',
    color: '#d97706',
    bg: '#451a03',
    badge: 'amber',
    icon: 'book',
    description: 'Recognized opening theory.',
  },
  forced: {
    id: 'forced',
    label: 'Forced',
    symbol: '□',
    color: '#94a3b8',
    bg: '#1e293b',
    badge: 'slate',
    icon: 'square',
    description: 'The only legal move available.',
  },
  inaccuracy: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#eab308',
    bg: '#422006',
    badge: 'yellow',
    icon: 'alert',
    description: 'A slight mistake that loses some advantage.',
  },
  mistake: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#f97316',
    bg: '#431407',
    badge: 'orange',
    icon: 'question',
    description: 'A noticeable mistake that damages the position.',
  },
  miss: {
    id: 'miss',
    label: 'Miss',
    symbol: '✕',
    color: '#ec4899',
    bg: '#500724',
    badge: 'pink',
    icon: 'cross',
    description: 'Missed a winning move or tactical opportunity.',
  },
  blunder: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ef4444',
    bg: '#450a0a',
    badge: 'red',
    icon: 'blunder',
    description: 'A serious blunder that significantly hurts the position.',
  },
};

// WTF Algorithm: Get the maximum evaluation loss threshold for a classification
export function getEvaluationLossThreshold(classif, prevEval) {
  const pEval = Math.abs(prevEval);
  let threshold = 0;

  switch (classif) {
    case Classification.BEST:
      threshold = 0.0001 * Math.pow(pEval, 2) + 0.0236 * pEval - 3.7143;
      break;
    case Classification.EXCELLENT:
      threshold = 0.0002 * Math.pow(pEval, 2) + 0.1231 * pEval + 27.5455;
      break;
    case Classification.GOOD:
      threshold = 0.0002 * Math.pow(pEval, 2) + 0.2643 * pEval + 60.5455;
      break;
    case Classification.INACCURACY:
      threshold = 0.0002 * Math.pow(pEval, 2) + 0.3624 * pEval + 108.0909;
      break;
    case Classification.MISTAKE:
      threshold = 0.0003 * Math.pow(pEval, 2) + 0.4027 * pEval + 225.8182;
      break;
    default:
      threshold = Infinity;
  }

  return Math.max(threshold, 0);
}

// Tactical Piece Values
export const pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: Infinity,
  m: 0,
};

export const promotions = ['q', 'r', 'b', 'n'];

// Helper to get attackers of a square
export function getAttackers(fen, square) {
  try {
    const chess = new Chess(fen);
    const turn = chess.turn();
    const attackerSquares = chess.attackers(square, turn);
    return attackerSquares.map((sq) => ({
      square: sq,
      piece: chess.get(sq),
    }));
  } catch (e) {
    return [];
  }
}

// Helper to detect if a piece on a square is hanging in currentFen
export function isPieceHanging(lastFen, currentFen, square) {
  try {
    const chess = new Chess(currentFen);
    const piece = chess.get(square);
    if (!piece) return false;

    const pieceColor = piece.color;
    const oppColor = pieceColor === 'w' ? 'b' : 'w';

    const attackerSquares = chess.attackers(square, oppColor);
    if (attackerSquares.length === 0) return false;

    const defenderSquares = chess.attackers(square, pieceColor);
    const pieceVal = pieceValues[piece.type] || 0;

    // 1. Undefended and attacked
    if (defenderSquares.length === 0 && attackerSquares.length > 0) {
      return true;
    }

    // 2. Attacked by a piece of lower material value
    for (const atkSq of attackerSquares) {
      const atkPiece = chess.get(atkSq);
      if (atkPiece && (pieceValues[atkPiece.type] || 0) < pieceVal) {
        return true;
      }
    }

    // 3. Number of attackers exceeds defenders
    if (attackerSquares.length > defenderSquares.length) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}
