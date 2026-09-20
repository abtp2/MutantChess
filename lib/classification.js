// Classification definitions, WTF threshold algorithm, and tactical board helpers
// High-precision tactical classification engine in pure JavaScript
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

// Classification types for non-top moves evaluated by Centipawn Loss (matching reference/classification.ts)
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
    color: '#26c2a3',
    bg: '#26c2a3',
    badge: 'teal',
    icon: 'lightning',
    description: 'A brilliant sacrifice that maintains or creates a winning edge.',
  },
  great: {
    id: 'great',
    label: 'Great Move',
    symbol: '!',
    color: '#418bf8',
    bg: '#418bf8',
    badge: 'blue',
    icon: 'sparkle',
    description: 'A critical move that finds the only winning or saving resource.',
  },
  best: {
    id: 'best',
    label: 'Best Move',
    symbol: '★',
    color: '#7fa650',
    bg: '#7fa650',
    badge: 'green',
    icon: 'star',
    description: 'The best move in the position.',
  },
  excellent: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '👍',
    color: '#98bc52',
    bg: '#98bc52',
    badge: 'lime',
    icon: 'thumbs-up',
    description: 'Almost as strong as the best move.',
  },
  good: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    color: '#8ba86d',
    bg: '#8ba86d',
    badge: 'lime',
    icon: 'check',
    description: 'A solid, playable move.',
  },
  book: {
    id: 'book',
    label: 'Book Move',
    symbol: '📖',
    color: '#c87a4b',
    bg: '#c87a4b',
    badge: 'amber',
    icon: 'book',
    description: 'Recognized opening theory.',
  },
  forced: {
    id: 'forced',
    label: 'Forced',
    symbol: '➔',
    color: '#6b7280',
    bg: '#6b7280',
    badge: 'slate',
    icon: 'arrow',
    description: 'The only legal move available.',
  },
  inaccuracy: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#f0c15c',
    bg: '#f0c15c',
    badge: 'yellow',
    icon: 'alert',
    description: 'A slight mistake that loses some advantage.',
  },
  mistake: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#f5a623',
    bg: '#f5a623',
    badge: 'orange',
    icon: 'question',
    description: 'A noticeable mistake that damages the position.',
  },
  miss: {
    id: 'miss',
    label: 'Miss',
    symbol: '✕',
    color: '#db4f48',
    bg: '#db4f48',
    badge: 'pink',
    icon: 'cross',
    description: 'Missed a winning move or tactical opportunity.',
  },
  blunder: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#e03b3b',
    bg: '#e03b3b',
    badge: 'red',
    icon: 'blunder',
    description: 'A serious blunder that significantly hurts the position.',
  },
};

// Mathematical Loss Threshold Algorithm
// Get the maximum evaluation loss for a classification to be applied
// Evaluation loss threshold for excellent in a previously equal position is ~27.5 cp
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

// Helper to get attackers of a square using the active turn on the board
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

// Internal helper to determine if a piece on a square is hanging in a given FEN
function isSquareHanging(fen, square) {
  try {
    const chess = new Chess(fen);
    const piece = chess.get(square);
    if (!piece) return false;

    const pieceColor = piece.color;
    const oppColor = pieceColor === 'w' ? 'b' : 'w';

    const attackerSquares = chess.attackers(square, oppColor);
    if (!attackerSquares || attackerSquares.length === 0) return false;

    const defenderSquares = chess.attackers(square, pieceColor);
    const pieceVal = pieceValues[piece.type] || 0;

    // 1. Completely undefended and attacked
    if (defenderSquares.length === 0 && attackerSquares.length > 0) {
      return true;
    }

    // 2. Attacked by an enemy piece of strictly lower material value
    for (const atkSq of attackerSquares) {
      const atkPiece = chess.get(atkSq);
      if (atkPiece && (pieceValues[atkPiece.type] || 0) < pieceVal) {
        return true;
      }
    }

    // 3. Attackers outnumber defenders
    if (attackerSquares.length > defenderSquares.length) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

// Helper to detect if a piece on a square is hanging in currentFen
// If lastFen is provided, ensures that the piece was either newly moved to square
// or was NOT already hanging in lastFen (preventing false sacrifice detection)
export function isPieceHanging(lastFen, currentFen, square) {
  try {
    if (!isSquareHanging(currentFen, square)) return false;

    if (lastFen) {
      const lastBoard = new Chess(lastFen);
      const currBoard = new Chess(currentFen);
      const pieceNow = currBoard.get(square);
      const pieceBefore = lastBoard.get(square);

      // If the piece just moved to this square, it is newly hanging
      if (!pieceBefore || pieceBefore.color !== pieceNow?.color || pieceBefore.type !== pieceNow?.type) {
        return true;
      }

      // If it was already on this square in lastFen, verify it was not already hanging
      const wasHangingBefore = isSquareHanging(lastFen, square);
      if (wasHangingBefore) {
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}
