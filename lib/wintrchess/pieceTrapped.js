// Trapped Piece Detector
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/pieceTrapped.ts)

import { Chess } from 'chess.js';
import { isPieceSafe } from './pieceSafety.js';
import { moveCreatesGreaterThreat } from './dangerLevels.js';
import { setFenTurn, toShortColor } from './utils.js';

/**
 * Returns whether a piece is trapped. If a piece is unsafe on its
 * current square and also in every square it can move to, it is trapped. If
 * danger levels is enabled, it is also trapped if moving it allows the
 * opponent a larger counterthreat.
 */
export function isPieceTrapped(board, piece, dangerLevels = true) {
  const pieceColorShort = toShortColor(piece.color);
  const calibratedBoard = new Chess(
    setFenTurn(board.fen(), pieceColorShort)
  );

  const standingPieceSafety = isPieceSafe(calibratedBoard, piece);

  const pieceMoves = calibratedBoard.moves({
    square: piece.square,
    verbose: true,
  });

  const allMovesUnsafe = pieceMoves.every((move) => {
    if (move.captured === 'k') return false;

    const escapeBoard = new Chess(calibratedBoard.fen());

    if (
      dangerLevels &&
      moveCreatesGreaterThreat(escapeBoard, piece, {
        piece: move.piece,
        color: move.color,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      })
    ) {
      return true;
    }

    let escapeMove;
    try {
      escapeMove = escapeBoard.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined,
      });
    } catch (e) {
      return true;
    }

    if (!escapeMove) return true;

    const escapedPieceSafety = isPieceSafe(
      escapeBoard,
      { ...piece, square: escapeMove.to },
      escapeMove
    );

    return !escapedPieceSafety;
  });

  return !standingPieceSafety && allMovesUnsafe;
}
