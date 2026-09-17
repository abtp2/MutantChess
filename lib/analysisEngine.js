// Chess.com style Deep Tactical Analysis and Game Review Engine for MutantChess
import { isBookMove } from './openings.js';
import { stockfishService } from './stockfishService.js';
import { Chess } from 'chess.js';

export const MOVE_CLASSIFICATIONS = {
  BRILLIANT: {
    id: 'brilliant',
    label: 'Brilliant',
    symbol: '!!',
    color: '#06b6d4',
    bg: '#083344',
    badge: 'cyan',
    description: 'A brilliant piece sacrifice that maintained or increased the winning advantage!',
  },
  GREAT: {
    id: 'great',
    label: 'Great Move',
    symbol: '!',
    color: '#14b8a6',
    bg: '#042f2e',
    badge: 'teal',
    description: 'A critical move that found the only winning or saving resource.',
  },
  BEST: {
    id: 'best',
    label: 'Best Move',
    symbol: '★',
    color: '#22c55e',
    bg: '#052e16',
    badge: 'green',
    description: 'The absolute best move found by the engine.',
  },
  EXCELLENT: {
    id: 'excellent',
    label: 'Excellent',
    symbol: '✓',
    color: '#84cc16',
    bg: '#1a2e05',
    badge: 'lime',
    description: 'Almost as strong as the best move.',
  },
  GOOD: {
    id: 'good',
    label: 'Good',
    symbol: '✓',
    color: '#a3e635',
    bg: '#1e293b',
    badge: 'emerald',
    description: 'A solid, playable move.',
  },
  BOOK: {
    id: 'book',
    label: 'Book',
    symbol: 'B',
    color: '#d97706',
    bg: '#451a03',
    badge: 'amber',
    description: 'Standard opening book theory.',
  },
  FORCED: {
    id: 'forced',
    label: 'Forced',
    symbol: '□',
    color: '#94a3b8',
    bg: '#1e293b',
    badge: 'slate',
    description: 'The only legal move available on the board.',
  },
  INACCURACY: {
    id: 'inaccuracy',
    label: 'Inaccuracy',
    symbol: '?!',
    color: '#eab308',
    bg: '#422006',
    badge: 'yellow',
    description: 'A slight mistake that loses some advantage.',
  },
  MISTAKE: {
    id: 'mistake',
    label: 'Mistake',
    symbol: '?',
    color: '#f97316',
    bg: '#431407',
    badge: 'orange',
    description: 'A noticeable mistake that damages the position.',
  },
  BLUNDER: {
    id: 'blunder',
    label: 'Blunder',
    symbol: '??',
    color: '#ef4444',
    bg: '#450a0a',
    badge: 'red',
    description: 'A serious blunder that turns the tables!',
  },
  MISS: {
    id: 'miss',
    label: 'Miss',
    symbol: '✕',
    color: '#ec4899',
    bg: '#500724',
    badge: 'pink',
    description: 'Missed a winning move or tactical opportunity.',
  },
};

export const COMMENTS = {
  brilliant: [
    'You found a brilliant way to sacrifice a piece.',
    'This sacrifice showcases a deep understanding of the position.',
    'A bold and exceptional sacrifice to gain a strategic edge.',
  ],
  great: [
    "You capitalized on your opponent's mistake effectively.",
    "This move takes full advantage of your opponent's error.",
    "A strong response to punish your opponent's oversight.",
  ],
  best: [
    'This has been the best move in this position.',
    'This was the most optimal move you could play here.',
    'The most precise and effective move for this scenario.',
  ],
  excellent: [
    'This was not the absolute best move, but it is just as strong.',
    'An excellent move that fits the demands of the position perfectly.',
    'A top-tier choice, even if not the single best move.',
  ],
  good: [
    'This is not among the best moves, but it is still acceptable.',
    'An acceptable move, but there were better options.',
    'This move works, but it misses stronger alternatives.',
  ],
  book: [
    'Standard opening book theory.',
    'Following recognized grandmaster opening theory.',
    'A classical and solid opening principle.',
  ],
  inaccuracy: [
    'This move causes you to lose some advantage.',
    'This move weakens your overall position.',
    'An avoidable slip that leads to a worse situation.',
  ],
  mistake: [
    'This move loses significant advantage.',
    'This move significantly worsens your position.',
    'This move severely harms your position.',
  ],
  blunder: [
    'This move loses significant advantage.',
    'This move significantly worsens your position.',
    'This move severely harms your position.',
  ],
  mate: [
    'Delivering checkmate is always a satisfying move.',
    'Checkmating your opponent is the ultimate goal.',
    'A decisive and final move to end the game.',
  ],
  mateIn: [
    'This is the right move to force an eventual checkmate.',
    'A precise move that guarantees a checkmate in the near future.',
    'This move sets up an unstoppable sequence to deliver checkmate.',
  ],
  delayMate: [
    'This move delays a checkmate, but your opponent is still being checkmated.',
    "You slowed down the checkmate sequence, but it's still guaranteed.",
    'A move that postpones the unavoidable checkmate you are delivering.',
  ],
  advanceMate: [
    "This decision shortens the path to your opponent's victory.",
    'You hastened the process of being checkmated with this move.',
    'This move brings your opponent closer to delivering checkmate.',
  ],
  loseAdvantage: [
    'This move causes you to lose the advantage you had.',
    'A costly error that sacrifices your winning edge.',
    'This move shifts the position from advantageous to equal or worse.',
  ],
  giveAdvantage: [
    'This move turns an equal position into a losing one.',
    'A mistake that hands the advantage to your opponent.',
    'This move creates a clear advantage for your opponent.',
  ],
  gettingMated: [
    'This move leads to an eventual forced checkmate by your opponent.',
    'A fatal error that guarantees your opponent will checkmate you.',
    'This move sets up an inevitable checkmate against you.',
  ],
  missMate: [
    'You missed an opportunity to force a checkmate, allowing your opponent to escape.',
    'A chance to secure a decisive checkmate was overlooked with this move.',
    'This move lets your opponent avoid a checkmate you could have forced.',
  ],
  missAdvantage: [
    'You missed an opportunity to gain an advantage.',
    'A key chance to improve your position was lost.',
    'This move overlooks a way to strengthen your position.',
  ],
  forced: [
    'There were no alternatives; this was the only possible move.',
    'You had no choice but to play this move.',
    'The situation left you with just one legal option, and this was it.',
  ],
};

const PIECE_NAMES = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

// Calculate win probability from White-perspective centipawns (0 to 100)
export function cpToWinProb(whiteCp) {
  if (whiteCp === null || whiteCp === undefined) return 50;
  // Clamped logistic model calibrated to modern grandmaster play (Lichess/Chess.com)
  const clamped = Math.max(-2000, Math.min(2000, whiteCp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

// Convert mate score to White-perspective centipawns
export function mateToCp(mate) {
  if (!mate) return 0;
  const sign = mate > 0 ? 1 : -1;
  return sign * (10000 - Math.abs(mate) * 100);
}

// Tactical hanging piece detector
export function detectHangingPiece(fenAfter, friendlyColor) {
  try {
    const c = new Chess(fenAfter);
    const opponentMoves = c.moves({ verbose: true });
    const PIECE_VALS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    for (const om of opponentMoves) {
      if (om.captured) {
        const victimVal = PIECE_VALS[om.captured] || 0;
        const attackerVal = PIECE_VALS[om.piece] || 0;
        if (victimVal >= 3 && attackerVal <= victimVal) {
          return {
            square: om.to,
            piece: PIECE_NAMES[om.captured] || 'piece',
            attacker: PIECE_NAMES[om.piece] || 'piece',
          };
        }
      }
    }
  } catch (e) {}
  return null;
}

export function invertColor(color) {
  return color === 'w' ? 'b' : 'w';
}

// Advanced SacTheRook Attackers/Defenders Matrix
export function getAttackersDefenders(chess, color, to) {
  try {
    const oppColor = invertColor(color);
    const attackers = chess.attackers(to, oppColor);
    const legalMoves = chess.moves({ verbose: true });
    const legalAttackers = attackers.filter((attacker) =>
      legalMoves.some((m) => m.from === attacker && m.to === to)
    );
    const legalAttackersPieces = legalAttackers.map((attacker) => chess.get(attacker));

    let defenders = [];
    let legalDefenders = [];
    let legalDefendersPieces = [];

    if (legalAttackers.length === 1) {
      const testChess = new Chess(chess.fen());
      try {
        testChess.move({ from: legalAttackers[0], to });
        defenders = testChess.attackers(to, color);
        const testMoves = testChess.moves({ verbose: true });
        legalDefenders = defenders.filter((defender) =>
          testMoves.some((m) => m.from === defender && m.to === to)
        );
        legalDefendersPieces = legalDefenders.map((defender) => chess.get(defender));
      } catch (e) {}
    } else if (legalAttackers.length > 1) {
      defenders = chess.attackers(to, color);
      legalDefenders = defenders.filter((defender) => {
        for (const attacker of legalAttackers) {
          const testChess = new Chess(chess.fen());
          try {
            testChess.move({ from: attacker, to });
            if (!testChess.moves({ verbose: true }).some((m) => m.from === defender && m.to === to)) {
              return false;
            }
          } catch (e) {
            return false;
          }
        }
        return true;
      });
      legalDefendersPieces = legalDefenders.map((defender) => chess.get(defender));
    }

    return {
      attackers: { squares: legalAttackers, pieces: legalAttackersPieces, length: legalAttackers.length },
      defenders: { squares: legalDefenders, pieces: legalDefendersPieces, length: legalDefenders.length },
    };
  } catch (e) {
    return {
      attackers: { squares: [], pieces: [], length: 0 },
      defenders: { squares: [], pieces: [], length: 0 },
    };
  }
}

// Check if a piece could be safely saved before the move
export function couldBeSaved(chess, square, color) {
  try {
    if (!chess.attackers(square, color).length) {
      for (const move of chess.moves({ verbose: true })) {
        if (move.from !== square) return true;
      }
    } else {
      for (const move of chess.moves({ verbose: true, square })) {
        const testChess = new Chess(move.after);
        if (!testChess.attackers(move.to, color).length) return true;
      }
    }
  } catch (e) {}
  return false;
}

// SacTheRook Sound Tactical Material Sacrifice Detector
export function isSacrifice(move, fenBefore, fenAfter) {
  if (!move) return false;
  try {
    const afterFen = (move && move.after) || fenAfter;
    const beforeFen = (move && move.before) || fenBefore;
    if (!afterFen || !beforeFen) return false;

    const chess = new Chess(afterFen);
    const chessBefore = new Chess(beforeFen);

    const sacrifying = [];
    const board = chess.board();

    for (const row of board) {
      for (const square of row) {
        if (!square || square.type === 'p') continue;
        if (square.color !== move.color) continue;

        const { attackers, defenders } = getAttackersDefenders(chess, move.color, square.square);

        // 1. Hanging piece without defenders
        if (!defenders.length && attackers.length && (!move.captured || move.captured === 'p')) {
          sacrifying.push(square);
          continue;
        }
        // 2. Minor piece attacked by enemy pawn
        if (
          (square.type === 'n' || square.type === 'b') &&
          !move.captured &&
          attackers.pieces.some((piece) => piece && piece.type === 'p')
        ) {
          sacrifying.push(square);
          continue;
        }
        // 3. Rook exchange sacrifice (e.g. for knight/bishop or undefended)
        if (
          square.type === 'r' &&
          attackers.length &&
          move.captured !== 'r' &&
          move.captured !== 'q' &&
          !(attackers.length === 1 && (attackers.pieces[0]?.type === 'q' || attackers.pieces[0]?.type === 'r') && defenders.length) &&
          !(defenders.length && (move.captured === 'n' || move.captured === 'b'))
        ) {
          sacrifying.push(square);
          continue;
        }
        // 4. Queen sacrifice
        if (
          square.type === 'q' &&
          attackers.length &&
          move.captured !== 'q' &&
          !(attackers.length === 1 && attackers.pieces[0]?.type === 'q' && defenders.length) &&
          !(attackers.length === 1 && attackers.pieces[0]?.type === 'r' && move.captured === 'r' && defenders.length)
        ) {
          sacrifying.push(square);
          continue;
        }
      }
    }

    for (const square of sacrifying) {
      const beforeSquare =
        chessBefore.get(square.square)?.color === chess.get(square.square)?.color &&
        chessBefore.get(square.square)?.type === chess.get(square.square)?.type
          ? square.square
          : move.from;

      if (couldBeSaved(chessBefore, beforeSquare, invertColor(move.color))) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

// Single legal move (Forced) detector
export function isForced(move, fenBefore) {
  try {
    const beforeFen = (move && move.before) || fenBefore;
    if (!beforeFen) return false;
    const c = new Chess(beforeFen);
    return c.moves().length === 1;
  } catch (e) {
    return false;
  }
}

// Classify a single move with White POV normalized to player
export function classifyMove({
  move,
  turn,
  prevEval,
  currEval,
  bestMove,
  isSacrifice: moveIsSacrifice,
  isBook,
  isForcedMove,
  topMoves = [],
  previousClassifications = [],
}) {
  if (isBook) {
    return { classification: MOVE_CLASSIFICATIONS.BOOK, contextualTag: 'book' };
  }

  if (isForcedMove) {
    return { classification: MOVE_CLASSIFICATIONS.FORCED, contextualTag: 'forced' };
  }

  const isWhite = turn === 'w';

  // Normalize evaluations to POV of the player who moved (+ means player is winning)
  const prevPlayerCp = isWhite ? prevEval.whiteCp : -prevEval.whiteCp;
  const currPlayerCp = isWhite ? currEval.whiteCp : -currEval.whiteCp;

  const prevPlayerMate = prevEval.whiteMate !== null && prevEval.whiteMate !== undefined
    ? (isWhite ? prevEval.whiteMate : -prevEval.whiteMate)
    : null;
  const currPlayerMate = currEval.whiteMate !== null && currEval.whiteMate !== undefined
    ? (isWhite ? currEval.whiteMate : -currEval.whiteMate)
    : null;

  // Win probability from POV of the player who moved
  const prevPlayerWinProb = isWhite ? prevEval.winProb : (100 - prevEval.winProb);
  const currPlayerWinProb = isWhite ? currEval.winProb : (100 - currEval.winProb);

  const movePlayedUci = (move.from || '') + (move.to || '') + (move.promotion || '').toLowerCase();
  const isTopEngine = bestMove && movePlayedUci && (bestMove.toLowerCase() === movePlayedUci);

  // Multi-PV candidate check (Top 2 or 3 moves)
  const isSecondOrThirdPv = topMoves.slice(1, 3).some((tm) => tm.uci && tm.uci.toLowerCase() === movePlayedUci);

  // Loss calculations: if played top engine move, cpLoss is 0
  const cpLoss = isTopEngine ? 0 : Math.max(0, prevPlayerCp - currPlayerCp);
  const winProbLoss = isTopEngine ? 0 : Math.max(0, prevPlayerWinProb - currPlayerWinProb);

  // === 1. Checkmate delivered on this move ===
  if (move.san?.includes('#') || (currPlayerMate !== null && Math.abs(currPlayerMate) === 0)) {
    return { classification: MOVE_CLASSIFICATIONS.BEST, contextualTag: 'mate' };
  }

  // === 2. Forced Checkmate Sequences ===
  // A. Started mate sequence (was not mate before, now player has forced mate)
  if (prevPlayerMate === null && currPlayerMate !== null && currPlayerMate > 0) {
    if (moveIsSacrifice) {
      return { classification: MOVE_CLASSIFICATIONS.BRILLIANT, contextualTag: 'brilliant' };
    }
    return { classification: MOVE_CLASSIFICATIONS.BEST, contextualTag: 'mateIn' };
  }

  // B. Right move to mate (player maintained or tightened mate sequence)
  if (
    prevPlayerMate !== null &&
    prevPlayerMate > 0 &&
    currPlayerMate !== null &&
    currPlayerMate > 0 &&
    currPlayerMate <= prevPlayerMate
  ) {
    if (moveIsSacrifice) {
      return { classification: MOVE_CLASSIFICATIONS.BRILLIANT, contextualTag: 'brilliant' };
    }
    return { classification: MOVE_CLASSIFICATIONS.BEST, contextualTag: 'mateIn' };
  }

  // C. Missed mate (had forced checkmate, now lost it)
  if (prevPlayerMate !== null && prevPlayerMate > 0 && (currPlayerMate === null || currPlayerMate <= 0)) {
    return { classification: MOVE_CLASSIFICATIONS.MISS, contextualTag: 'missMate' };
  }

  // D. Delayed mate (opponent had mate on player, and player played the best defense to stretch it)
  if (
    prevPlayerMate !== null &&
    prevPlayerMate < 0 &&
    currPlayerMate !== null &&
    currPlayerMate < 0 &&
    Math.abs(currPlayerMate) >= Math.abs(prevPlayerMate)
  ) {
    return { classification: MOVE_CLASSIFICATIONS.GOOD, contextualTag: 'delayMate' };
  }

  // E. Advance mate (player made move that accelerated opponent's mate)
  if (
    prevPlayerMate !== null &&
    prevPlayerMate < 0 &&
    currPlayerMate !== null &&
    currPlayerMate < 0 &&
    Math.abs(currPlayerMate) < Math.abs(prevPlayerMate)
  ) {
    return { classification: MOVE_CLASSIFICATIONS.BLUNDER, contextualTag: 'advanceMate' };
  }

  // F. Getting mated (was not mate, now opponent has forced mate)
  if (prevPlayerMate === null && currPlayerMate !== null && currPlayerMate < 0) {
    const isAlreadyLost = prevPlayerCp <= -300;
    return {
      classification: isAlreadyLost ? MOVE_CLASSIFICATIONS.MISTAKE : MOVE_CLASSIFICATIONS.BLUNDER,
      contextualTag: 'gettingMated',
    };
  }

  // === 3. Brilliant Move (Sound Tactical Material Sacrifice) ===
  // SacTheRook & Chess.com standard: sacrifice gives up material, but leaves evaluation winning or equal
  if (moveIsSacrifice && cpLoss <= 25 && (currPlayerCp >= -60 || (currPlayerMate !== null && currPlayerMate > 0))) {
    return { classification: MOVE_CLASSIFICATIONS.BRILLIANT, contextualTag: 'brilliant' };
  }

  // === 4. Great Move (Punishing Blunder or Finding Sharp Winning Resource) ===
  const oppLastClassification = previousClassifications[previousClassifications.length - 1];
  const oppBlundered = oppLastClassification && (oppLastClassification.id === 'blunder' || oppLastClassification.id === 'mistake');
  const isComeback = prevPlayerCp <= -100 && currPlayerCp >= -20 && cpLoss <= 15;
  const isSharpTactical = prevPlayerCp >= 120 && currPlayerCp >= 280 && isTopEngine;

  if ((isComeback || isSharpTactical || (oppBlundered && (isTopEngine || cpLoss <= 10))) && !moveIsSacrifice) {
    return { classification: MOVE_CLASSIFICATIONS.GREAT, contextualTag: 'great' };
  }

  // === 5. Best Move ===
  if (isTopEngine || cpLoss <= 10) {
    return { classification: MOVE_CLASSIFICATIONS.BEST, contextualTag: 'best' };
  }

  // === 6. Miss (Overlooked Great Advantage or Punishment) ===
  if (prevPlayerCp >= 200 && (cpLoss >= 150 || winProbLoss >= 16) && currPlayerCp < 100) {
    return { classification: MOVE_CLASSIFICATIONS.MISS, contextualTag: 'missAdvantage' };
  }
  if (oppBlundered && (cpLoss >= 120 || winProbLoss >= 12)) {
    return { classification: MOVE_CLASSIFICATIONS.MISS, contextualTag: 'missAdvantage' };
  }

  // === 7. Advantage Swings (Lose / Give Advantage) ===
  // Lose advantage: was >= +2.0 (+200 cp), dropped below +1.0 (+100 cp)
  if (prevPlayerCp >= 200 && currPlayerCp < 100 && cpLoss >= 110) {
    return { classification: MOVE_CLASSIFICATIONS.MISTAKE, contextualTag: 'loseAdvantage' };
  }
  // Give advantage: was >= -1.0 (-100 cp), dropped to <= -2.5 (-250 cp)
  if (prevPlayerCp >= -100 && currPlayerCp <= -250 && cpLoss >= 130) {
    return { classification: MOVE_CLASSIFICATIONS.MISTAKE, contextualTag: 'giveAdvantage' };
  }

  // === 8. Blunder ===
  if (winProbLoss >= 20 || cpLoss >= 250) {
    return { classification: MOVE_CLASSIFICATIONS.BLUNDER, contextualTag: 'blunder' };
  }

  // === 9. Mistake ===
  if (winProbLoss >= 10 || cpLoss >= 120) {
    return { classification: MOVE_CLASSIFICATIONS.MISTAKE, contextualTag: 'mistake' };
  }

  // === 10. Inaccuracy ===
  if (winProbLoss >= 5 || cpLoss >= 50) {
    return { classification: MOVE_CLASSIFICATIONS.INACCURACY, contextualTag: 'inaccuracy' };
  }

  // === 11. Excellent (Multi-PV candidate or very low cp loss) ===
  if (isSecondOrThirdPv || (cpLoss <= 28 && winProbLoss <= 3)) {
    return { classification: MOVE_CLASSIFICATIONS.EXCELLENT, contextualTag: 'excellent' };
  }

  // === 12. Good Move ===
  return { classification: MOVE_CLASSIFICATIONS.GOOD, contextualTag: 'good' };
}

// Generate authentic Chess.com and SacTheRook style Coach Commentary
export function generateCoachExplanation({
  classification,
  san,
  move,
  turn,
  prevEval,
  currEval,
  bestMoveSan,
  fenBefore,
  fenAfter,
  contextualTag,
}) {
  const isWhite = turn === 'w';
  const player = isWhite ? 'White' : 'Black';
  const opponent = isWhite ? 'Black' : 'White';
  const pieceName = (move && move.piece && PIECE_NAMES[move.piece]) || 'piece';

  const tag = contextualTag || classification.id;
  const commentList = COMMENTS[tag] || COMMENTS[classification.id] || [];

  // 1. Specific Mate commentary
  if (tag === 'mate') {
    return `Checkmate! ${COMMENTS.mate[0]}`;
  }
  if (tag === 'mateIn') {
    const mateCount = currEval.whiteMate !== null ? Math.abs(currEval.whiteMate) : '';
    return `${COMMENTS.mateIn[0]} Mate in ${mateCount} is now forced.`;
  }
  if (tag === 'delayMate') {
    return COMMENTS.delayMate[0];
  }
  if (tag === 'advanceMate') {
    return COMMENTS.advanceMate[0];
  }
  if (tag === 'gettingMated') {
    return `${COMMENTS.gettingMated[0]} ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }
  if (tag === 'missMate') {
    return `${COMMENTS.missMate[0]} ${bestMoveSan ? `You could have forced mate with ${bestMoveSan}.` : ''}`;
  }

  // 2. Advantage swing commentary
  if (tag === 'loseAdvantage') {
    return `${COMMENTS.loseAdvantage[0]} ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }
  if (tag === 'giveAdvantage') {
    return `${COMMENTS.giveAdvantage[0]} ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }
  if (tag === 'missAdvantage') {
    return `${COMMENTS.missAdvantage[0]} ${bestMoveSan ? `A much stronger continuation was ${bestMoveSan}.` : ''}`;
  }
  if (tag === 'forced') {
    return COMMENTS.forced[0];
  }

  // 3. Hanging piece detector on blunders / mistakes
  const hanging = fenAfter ? detectHangingPiece(fenAfter, turn) : null;
  if ((classification.id === 'blunder' || classification.id === 'mistake') && hanging) {
    return `${classification.label}! This leaves your ${hanging.piece} on ${hanging.square} vulnerable to capture. ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }

  // 4. Tactical sacrifice (Brilliant)
  if (classification.id === 'brilliant') {
    return `Brilliant move! You offered a tactical ${pieceName} sacrifice that keeps a winning advantage and cracks open ${opponent}'s defenses.`;
  }

  // 5. Great move
  if (classification.id === 'great') {
    return `A great move! ${COMMENTS.great[0]} You found the precise tactical continuation.`;
  }

  // 6. Best move
  if (classification.id === 'best') {
    if (san.includes('+')) return `The best move! Delivers an active check that restricts ${opponent}'s king mobility.`;
    if (san === 'O-O' || san === 'O-O-O') return `The best move! Tucking the king to safety and connecting the rooks.`;
    if (san.includes('x') && move && move.captured) {
      return `The best move! Capturing the ${PIECE_NAMES[move.captured] || 'piece'} maintains optimal piece coordination.`;
    }
    return `The best move! ${COMMENTS.best[0]}`;
  }

  // 7. Excellent
  if (classification.id === 'excellent') {
    return `An excellent choice! ${COMMENTS.excellent[0]}`;
  }

  // 8. Inaccuracy
  if (classification.id === 'inaccuracy') {
    return `An inaccuracy. ${COMMENTS.inaccuracy[0]} ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }

  // 9. Mistake
  if (classification.id === 'mistake') {
    return `A mistake. ${COMMENTS.mistake[0]} ${bestMoveSan ? `Better was ${bestMoveSan}.` : ''}`;
  }

  // 10. Blunder
  if (classification.id === 'blunder') {
    return `A critical blunder! ${COMMENTS.blunder[0]} ${bestMoveSan ? `Best was ${bestMoveSan}.` : ''}`;
  }

  // Fallback
  if (commentList && commentList.length > 0) {
    return commentList[0];
  }

  return `Played ${san}.`;
}

// Calculate Chess.com Estimated Performance Rating (Elo)
export function calculateEstimatedElo(accuracy, moveCount, stats) {
  if (!moveCount || moveCount === 0) return 1000;

  let elo = 0;
  if (accuracy >= 98) {
    elo = 2650 + (accuracy - 98) * 110;
  } else if (accuracy >= 90) {
    elo = 2050 + ((accuracy - 90) / 8) * 600;
  } else if (accuracy >= 80) {
    elo = 1550 + ((accuracy - 80) / 10) * 500;
  } else if (accuracy >= 68) {
    elo = 1100 + ((accuracy - 68) / 12) * 450;
  } else if (accuracy >= 50) {
    elo = 650 + ((accuracy - 50) / 18) * 450;
  } else {
    elo = Math.max(300, 350 + (accuracy / 50) * 300);
  }

  if (stats) {
    elo += (stats.brilliant || 0) * 75;
    elo += (stats.great || 0) * 35;
    elo -= (stats.blunder || 0) * 50;
    elo -= (stats.mistake || 0) * 20;
  }

  return Math.max(350, Math.min(3150, Math.round(elo / 25) * 25));
}

// Helper to convert UCI string like "e2e4" to SAN "e4"
export function uciToSan(fen, uci) {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const m = c.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return m ? m.san : uci;
  } catch (e) {
    return uci;
  }
}

// Full game review runner (Stockfish 18 WASM with Tactical Depth 16)
export async function analyzeFullGame(moves, onProgress, depth = 16) {
  const chess = new Chess();
  const fens = [chess.fen()];
  const historyUci = [];
  const normalizedMoves = [];

  for (const m of moves) {
    const moveParam = typeof m === 'string' ? m : (m.san || { from: m.from, to: m.to, promotion: m.promotion || 'q' });
    let res = null;
    try {
      res = chess.move(moveParam);
    } catch (e) {
      try {
        res = chess.move(m);
      } catch (e2) {}
    }

    if (!res) break;
    normalizedMoves.push(res);
    historyUci.push(res.from + res.to + (res.promotion || ''));
    fens.push(chess.fen());
  }

  const evaluations = [];
  const total = fens.length;

  // Deep Stockfish evaluation with Multi-PV 3 for parallel candidate analysis
  for (let i = 0; i < total; i++) {
    const currentMove = i > 0 ? normalizedMoves[i - 1] : null;
    if (onProgress) {
      onProgress({
        step: 'evaluating',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        san: currentMove ? currentMove.san : 'Initial',
      });
    }
    const fen = fens[i];
    const evalData = await stockfishService.evaluatePosition({ fen, depth, multiPv: 3 });
    const whiteCp = evalData && evalData.whiteMate !== null && evalData.whiteMate !== undefined
      ? mateToCp(evalData.whiteMate)
      : (evalData ? evalData.whiteCp : 0);

    evaluations.push({
      fen,
      rawCp: evalData ? evalData.rawCp : 0,
      rawMate: evalData ? evalData.rawMate : null,
      whiteCp,
      whiteMate: evalData ? evalData.whiteMate : null,
      cp: whiteCp,
      mate: evalData ? evalData.whiteMate : null,
      winProb: cpToWinProb(whiteCp),
      bestMove: evalData ? evalData.bestMove : null,
      topMoves: evalData ? (evalData.topMoves || []) : [],
      pv: evalData ? evalData.pv : '',
      depth: evalData ? evalData.depth : depth,
    });
  }

  const classifiedMoves = [];
  const previousClassifications = [];
  let whiteAccuracySum = 0;
  let whiteMoveCount = 0;
  let blackAccuracySum = 0;
  let blackMoveCount = 0;

  const stats = {
    w: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    b: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
  };

  for (let i = 0; i < normalizedMoves.length; i++) {
    const move = normalizedMoves[i];
    const prevEval = evaluations[i] || { whiteCp: 0, winProb: 50, topMoves: [] };
    const currEval = evaluations[i + 1] || { whiteCp: 0, winProb: 50, topMoves: [] };
    const turn = move.color || (i % 2 === 0 ? 'w' : 'b');
    const isWhite = turn === 'w';

    const isBook = isBookMove(historyUci, i);
    const isForcedMove = isForced(move, fens[i]);

    const movePlayedUci = (move.from || '') + (move.to || '') + (move.promotion || '').toLowerCase();
    const isTopEngine = prevEval.bestMove && movePlayedUci && (prevEval.bestMove.toLowerCase() === movePlayedUci);

    const prevPlayerCp = isWhite ? prevEval.whiteCp : -prevEval.whiteCp;
    const currPlayerCp = isWhite ? currEval.whiteCp : -currEval.whiteCp;
    const cpLoss = isTopEngine ? 0 : Math.max(0, prevPlayerCp - currPlayerCp);

    const isSacrificeMove = isSacrifice(move, fens[i], fens[i + 1]);

    const { classification, contextualTag } = classifyMove({
      move,
      turn,
      prevEval,
      currEval,
      bestMove: prevEval.bestMove,
      isSacrifice: isSacrificeMove,
      isBook,
      isForcedMove,
      topMoves: prevEval.topMoves || [],
      previousClassifications,
    });

    previousClassifications.push(classification);

    if (stats[turn][classification.id] !== undefined) {
      stats[turn][classification.id]++;
    }

    // CAPS accuracy modeling via exponential win probability loss (Lichess/Chess.com curve)
    const prevProb = isWhite ? prevEval.winProb : 100 - prevEval.winProb;
    const currProb = isWhite ? currEval.winProb : 100 - currEval.winProb;
    const winProbLoss = isTopEngine ? 0 : Math.max(0, prevProb - currProb);

    // Chess.com CAPS2 formula: 103.1668 * e^(-0.04354 * winProbLoss) - 3.1669
    let moveAccuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winProbLoss) - 3.1669));
    if (isTopEngine || classification.id === 'brilliant' || classification.id === 'great' || classification.id === 'forced') {
      moveAccuracy = 100;
    }

    if (isWhite) {
      whiteAccuracySum += moveAccuracy;
      whiteMoveCount++;
    } else {
      blackAccuracySum += moveAccuracy;
      blackMoveCount++;
    }

    const bestMoveSan = uciToSan(fens[i], prevEval.bestMove);
    const san = move.san || `${move.from}-${move.to}`;

    // Score display
    let scoreDisplay = '0.0';
    if (currEval.mate !== null) {
      scoreDisplay = `M${Math.abs(currEval.mate)}`;
    } else {
      const p = (currEval.cp / 100).toFixed(2);
      scoreDisplay = currEval.cp > 0 ? `+${p}` : `${p}`;
    }

    const coachExplanation = generateCoachExplanation({
      classification,
      san,
      move,
      turn,
      prevEval,
      currEval,
      bestMoveSan,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      contextualTag,
    });

    classifiedMoves.push({
      move,
      san,
      from: move.from,
      to: move.to,
      fen: currEval.fen,
      prevEval,
      currEval,
      bestMove: prevEval.bestMove,
      bestMoveSan,
      scoreDisplay,
      coachExplanation,
      classification,
      contextualTag,
      accuracy: Math.round(moveAccuracy),
    });
  }

  const whiteAccuracy = whiteMoveCount > 0 ? Math.round(whiteAccuracySum / whiteMoveCount) : 100;
  const blackAccuracy = blackMoveCount > 0 ? Math.round(blackAccuracySum / blackMoveCount) : 100;

  const whiteEstimatedElo = calculateEstimatedElo(whiteAccuracy, whiteMoveCount, stats.w);
  const blackEstimatedElo = calculateEstimatedElo(blackAccuracy, blackMoveCount, stats.b);

  return {
    evaluations,
    classifiedMoves,
    whiteAccuracy,
    blackAccuracy,
    whiteEstimatedElo,
    blackEstimatedElo,
    stats,
  };
}
