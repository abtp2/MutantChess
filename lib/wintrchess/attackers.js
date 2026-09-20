// Attackers & Battery Detector
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/attackers.ts)

import { Chess } from 'chess.js';
import {
  setFenTurn,
  flipPieceColour,
  toShortColor,
  getCaptureSquare,
  toRawMove,
  isMovesEqual,
  xorWith,
} from './utils.js';

export function directAttackingMoves(board, piece) {
  const opponentShort = toShortColor(flipPieceColour(piece.color));

  // Set turn to attacker's side (opposite of piece)
  const attackerBoard = new Chess(
    setFenTurn(board.fen(), opponentShort)
  );

  const attackingMoves = attackerBoard
    .moves({ verbose: true })
    .filter((move) => getCaptureSquare(move) === piece.square)
    .map(toRawMove);

  const attackerSquares = attackerBoard.attackers(piece.square, opponentShort);
  const kingAttackerSquare = attackerSquares.find((sq) => {
    const p = attackerBoard.get(sq);
    return p && p.type === 'k';
  });

  if (kingAttackerSquare && !attackingMoves.some((attack) => attack.piece === 'k')) {
    attackingMoves.push({
      piece: 'k',
      color: opponentShort,
      from: kingAttackerSquare,
      to: piece.square,
    });
  }

  return attackingMoves;
}

export function getAttackingMoves(board, piece, transitive = true) {
  const attackingMoves = directAttackingMoves(board, piece);

  if (!transitive) return attackingMoves;

  // Keep a record of each transitive attacker and the FEN on
  // which they are considered a direct attacker
  const frontier = attackingMoves.map((attackingMove) => ({
    directFen: board.fen(),
    square: attackingMove.from,
    type: attackingMove.piece,
  }));

  const visitedSquares = new Set(attackingMoves.map((m) => m.from));

  while (frontier.length > 0) {
    const transitiveAttacker = frontier.pop();
    if (!transitiveAttacker) break;

    // A king cannot be at the front of a battery
    if (transitiveAttacker.type === 'k') {
      continue;
    }

    const transitiveBoard = new Chess(transitiveAttacker.directFen);
    const oldAttackingMoves = directAttackingMoves(transitiveBoard, piece);

    transitiveBoard.remove(transitiveAttacker.square);

    // Find revealed attackers as a XOR between old (removed piece excluded)
    // and new direct attackers list
    const filteredOld = oldAttackingMoves.filter(
      (m) => m.from !== transitiveAttacker.square
    );
    const newAttackingMoves = directAttackingMoves(transitiveBoard, piece);

    const revealedAttackingMoves = xorWith(
      filteredOld,
      newAttackingMoves,
      isMovesEqual
    ).filter((m) => !visitedSquares.has(m.from));

    for (const m of revealedAttackingMoves) {
      visitedSquares.add(m.from);
      attackingMoves.push(m);
      frontier.push({
        directFen: transitiveBoard.fen(),
        square: m.from,
        type: m.piece,
      });
    }
  }

  return attackingMoves;
}
