// Piece Safety & Unsafe Piece Detector
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/pieceSafety.ts)

import { minBy, pieceValues, getBoardPieces, toShortColor, toBoardPiece } from './utils.js';
import { getAttackingMoves } from './attackers.js';
import { getDefendingMoves } from './defenders.js';

export function isPieceSafe(board, piece, playedMove) {
  const directAttackers = getAttackingMoves(board, piece, false).map(toBoardPiece);
  const attackers = getAttackingMoves(board, piece).map(toBoardPiece);
  const defenders = getDefendingMoves(board, piece).map(toBoardPiece);

  // Favourable, decimal sacrifices (rook for 2 pieces etc.) are safe
  if (
    playedMove?.captured &&
    piece.type === 'r' &&
    pieceValues[playedMove.captured] === pieceValues['n'] &&
    attackers.length === 1 &&
    defenders.length > 0 &&
    pieceValues[attackers[0].type] === pieceValues['n']
  ) {
    return true;
  }

  // A piece with a direct attacker of lower value than itself isn't safe
  const hasLowerValueAttacker = directAttackers.some(
    (attacker) => pieceValues[attacker.type] < pieceValues[piece.type]
  );

  if (hasLowerValueAttacker) return false;

  // A piece that does not have more attackers than it has defenders is safe
  if (attackers.length <= defenders.length) {
    return true;
  }

  // A piece lower in value than any direct attacker, and with any
  // defender lower in value than all direct attackers, must be safe
  const lowestValueAttacker = minBy(
    directAttackers,
    (attacker) => pieceValues[attacker.type]
  );

  if (!lowestValueAttacker) return true;

  if (
    pieceValues[piece.type] < pieceValues[lowestValueAttacker.type] &&
    defenders.some(
      (defender) => pieceValues[defender.type] < pieceValues[lowestValueAttacker.type]
    )
  ) {
    return true;
  }

  // A piece defended by any pawn, at this point, must be safe
  if (defenders.some((defender) => defender.type === 'p')) {
    return true;
  }

  return false;
}

export function getUnsafePieces(board, colour, playedMove) {
  const capturedPieceValue = playedMove?.captured
    ? (pieceValues[playedMove.captured] || 0)
    : 0;

  const targetShortColor = toShortColor(colour);

  return getBoardPieces(board).filter((piece) =>
    piece &&
    toShortColor(piece.color) === targetShortColor &&
    piece.type !== 'p' &&
    piece.type !== 'k' &&
    (pieceValues[piece.type] || 0) > capturedPieceValue &&
    !isPieceSafe(board, piece, playedMove)
  );
}
