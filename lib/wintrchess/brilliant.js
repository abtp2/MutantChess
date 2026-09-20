// Brilliant Move Classification
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/classification/brilliant.ts)

import { toShortColor } from './utils.js';
import { isMoveCriticalCandidate } from './criticalMove.js';
import { getUnsafePieces } from './pieceSafety.js';
import { hasDangerLevels } from './dangerLevels.js';
import { isPieceTrapped } from './pieceTrapped.js';
import { getAttackingMoves } from './attackers.js';

/**
 * Consider brilliant classification based on a state.
 * Returns whether brilliant is recommended.
 *
 * @param {object} previous - ExtractedPreviousNode: { board, evaluation, subjectiveEvaluation, secondSubjectiveEvaluation, ... }
 * @param {object} current - ExtractedCurrentNode: { board, evaluation, subjectiveEvaluation, playedMove, ... }
 * @returns {boolean}
 */
export function considerBrilliantClassification(previous, current) {
  if (!isMoveCriticalCandidate(previous, current)) return false;

  // Promotions cannot be brilliant
  if (current.playedMove?.promotion) return false;

  const moveColorShort = toShortColor(current.playedMove?.color);

  const previousUnsafePieces = getUnsafePieces(
    previous.board,
    moveColorShort
  );

  const unsafePieces = getUnsafePieces(
    current.board,
    moveColorShort,
    current.playedMove
  );

  const isCurrentCheck = current.board.isCheck
    ? current.board.isCheck()
    : (current.board.inCheck ? current.board.inCheck() : false);

  // Moving a piece to safety (fewer unsafe pieces than in previous position)
  // disallows a brilliant (unless in check)
  if (
    !isCurrentCheck &&
    unsafePieces.length < previousUnsafePieces.length
  ) {
    return false;
  }

  // Detect equal or greater counterthreats when unsafe piece is taken
  const dangerLevelsProtected = unsafePieces.every((unsafePiece) =>
    hasDangerLevels(
      current.board,
      unsafePiece,
      getAttackingMoves(current.board, unsafePiece, false)
    )
  );

  if (dangerLevelsProtected) return false;

  const previousTrappedPieces = previousUnsafePieces.filter((unsafePiece) =>
    isPieceTrapped(previous.board, unsafePiece)
  );

  const trappedPieces = unsafePieces.filter((unsafePiece) =>
    isPieceTrapped(current.board, unsafePiece)
  );

  const movedPieceTrapped = previousTrappedPieces.some(
    (trappedPiece) => trappedPiece.square === current.playedMove?.from
  );

  if (
    trappedPieces.length === unsafePieces.length ||
    movedPieceTrapped ||
    trappedPieces.length < previousTrappedPieces.length
  ) {
    return false;
  }

  return unsafePieces.length > 0;
}
