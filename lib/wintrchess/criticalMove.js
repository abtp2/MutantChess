// Critical Move Candidate Check
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/reporter/utils/criticalMove.ts)

/**
 * Returns whether a move is critical to maintaining an
 * advantage - moves that are easy to find or forced cannot be critical.
 * Also serves as a preliminary check for critical and brilliant moves.
 */
export function isMoveCriticalCandidate(previous, current) {
  // Still completely winning even if this move hadn't been found
  const secondSubjectiveEval = previous.secondSubjectiveEvaluation;

  if (secondSubjectiveEval) {
    if (
      (secondSubjectiveEval.type === 'centipawn' || secondSubjectiveEval.type === 'cp') &&
      secondSubjectiveEval.value >= 700
    ) {
      return false;
    }
  } else {
    if (
      current.evaluation &&
      (current.evaluation.type === 'centipawn' || current.evaluation.type === 'cp') &&
      current.subjectiveEvaluation?.value >= 700
    ) {
      return false;
    }
  }

  // Moves in losing positions cannot be critical
  if (current.subjectiveEvaluation && current.subjectiveEvaluation.value < 0) {
    return false;
  }

  // Disallow queen promotions as critical moves
  if (current.playedMove?.promotion === 'q' || current.playedMove?.promotion === 'Q') {
    return false;
  }

  // Disallow moves that must be played anyway to escape check
  const wasInCheck = previous.board.isCheck
    ? previous.board.isCheck()
    : (previous.board.inCheck ? previous.board.inCheck() : false);

  if (wasInCheck) {
    return false;
  }

  return true;
}
