// Defenders & Recapture Set Calculator
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/defenders.ts)

import { Chess } from 'chess.js';
import {
  setFenTurn,
  flipPieceColour,
  toShortColor,
  minBy,
} from './utils.js';
import { getAttackingMoves } from './attackers.js';

export function getDefendingMoves(board, piece, transitive = true) {
  const defenderBoard = new Chess(board.fen());
  const attackingMoves = getAttackingMoves(defenderBoard, piece, false);

  // Where there are attackers, simulate taking the piece with each attacker
  // and record the minima of recaptures
  const recapturersSets = attackingMoves
    .map((attackingMove) => {
      const captureBoard = new Chess(
        setFenTurn(
          defenderBoard.fen(),
          toShortColor(flipPieceColour(piece.color))
        )
      );

      try {
        captureBoard.move({
          from: attackingMove.from,
          to: attackingMove.to,
          promotion: attackingMove.promotion || undefined,
        });
      } catch (e) {
        return null;
      }

      return getAttackingMoves(
        captureBoard,
        {
          type: attackingMove.piece,
          color: attackingMove.color,
          square: attackingMove.to,
        },
        transitive
      );
    })
    .filter((set) => set !== null && set !== undefined);

  const smallestRecapturerSet = minBy(
    recapturersSets,
    (recapturers) => recapturers.length
  );

  // Where there are no attackers, flip the colour of the piece and count
  // the attackers of the flipped piece
  if (!smallestRecapturerSet) {
    const flippedColor = toShortColor(flipPieceColour(piece.color));
    const flippedPiece = {
      type: piece.type,
      color: flippedColor,
      square: piece.square,
    };

    defenderBoard.put(flippedPiece, piece.square);
    return getAttackingMoves(defenderBoard, flippedPiece, transitive);
  }

  return smallestRecapturerSet;
}
