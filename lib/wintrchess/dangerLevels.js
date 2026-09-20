// Danger Levels Calculator & Counterthreat Evaluator
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/dangerLevels.ts)

import { Chess } from 'chess.js';
import {
  pieceValues,
  parseSanMove,
  differenceWith,
  isMovesEqual,
  toShortColor,
} from './utils.js';
import { getUnsafePieces } from './pieceSafety.js';
import { getAttackingMoves } from './attackers.js';

/**
 * Returns a list of attacking moves of unsafe pieces of a
 * given colour that are higher or equal in value to the threatened piece.
 */
export function relativeUnsafePieceAttacks(
  actionBoard,
  threatenedPiece,
  colour,
  playedMove
) {
  return getUnsafePieces(actionBoard, colour, playedMove)
    .filter(
      (unsafePiece) =>
        unsafePiece.square !== threatenedPiece.square &&
        (pieceValues[unsafePiece.type] || 0) >= (pieceValues[threatenedPiece.type] || 0)
    )
    .map((unsafePiece) => getAttackingMoves(actionBoard, unsafePiece, false))
    .reduce((acc, val) => acc.concat(val), []);
}

/**
 * Assuming that a given piece is under threat, act on the threat
 * through a given move. For example, capturing it as the opponent, or moving
 * it to safety. Returns whether playing the move creates a greater
 * counterthreat than that already imposed on the threatened piece.
 */
export function moveCreatesGreaterThreat(board, threatenedPiece, actingMove) {
  const actionBoard = new Chess(board.fen());

  // Pieces of the acting colour, >= in value to the threatened piece
  // that are already unsafe even before the acting move is played
  const previousRelativeAttacks = relativeUnsafePieceAttacks(
    actionBoard,
    threatenedPiece,
    toShortColor(actingMove.color)
  );

  let bakedMove;
  try {
    bakedMove = actionBoard.move({
      from: actingMove.from,
      to: actingMove.to,
      promotion: actingMove.promotion || undefined,
    });
  } catch (e) {
    return false;
  }

  // Attacks on unsafe pieces >= in value to threatened piece that
  // now exist after the acting move has been played
  const relativeAttacks = relativeUnsafePieceAttacks(
    actionBoard,
    threatenedPiece,
    toShortColor(actingMove.color),
    bakedMove
  );

  const newRelativeAttacks = differenceWith(
    relativeAttacks,
    previousRelativeAttacks,
    isMovesEqual
  );

  if (newRelativeAttacks.length > 0) return true;

  // Lower value piece sacrifice that if taken leads to mate
  const lowValueCheckmatePin =
    (pieceValues[threatenedPiece.type] || 0) < pieceValues['q'] &&
    actionBoard.moves().some((move) => parseSanMove(move).checkmate);

  return lowValueCheckmatePin;
}

export function moveLeavesGreaterThreat(board, threatenedPiece, actingMove) {
  const actionBoard = new Chess(board.fen());

  try {
    actionBoard.move({
      from: actingMove.from,
      to: actingMove.to,
      promotion: actingMove.promotion || undefined,
    });
  } catch (e) {
    return false;
  }

  // Attacks on unsafe pieces >= in value to threatened piece after move
  const relativeAttacks = relativeUnsafePieceAttacks(
    actionBoard,
    threatenedPiece,
    toShortColor(actingMove.color)
  );

  if (relativeAttacks.length > 0) return true;

  // Lower value piece sacrifice that if taken leads to mate
  const lowValueCheckmatePin =
    (pieceValues[threatenedPiece.type] || 0) < pieceValues['q'] &&
    actionBoard.moves().some((move) => parseSanMove(move).checkmate);

  return lowValueCheckmatePin;
}

/**
 * Returns whether all acting moves create a threat larger than
 * that imposed on the threatened piece. Equality strategies are `creates`
 * when relative threats after the move must be a direct result thereof,
 * and `leaves` when it should only check for the existence of them at all.
 */
export function hasDangerLevels(
  board,
  threatenedPiece,
  actingMoves,
  equalityStrategy = 'leaves'
) {
  if (!actingMoves || actingMoves.length === 0) return false;

  return actingMoves.every((actingMove) =>
    equalityStrategy === 'creates'
      ? moveCreatesGreaterThreat(board, threatenedPiece, actingMove)
      : moveLeavesGreaterThreat(board, threatenedPiece, actingMove)
  );
}
