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

// Genuine piece sacrifice detector for Brilliant moves
export function detectSacrifice(fenBefore, fenAfter, move, isTopEngine, cpLoss) {
  // Sacrifices must be the top engine move or near best
  if (!isTopEngine && cpLoss > 15) return false;

  const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const pieceVal = PIECE_VALUES[move.piece] || 0;
  if (pieceVal < 3) return false;

  const capturedVal = move.captured ? (PIECE_VALUES[move.captured] || 0) : 0;

  // Case 1: Exchange sacrifice (e.g. Rook captures Knight or Bishop)
  if (move.piece === 'r' && (move.captured === 'n' || move.captured === 'b')) {
    return true;
  }

  // Case 2: Queen captures minor piece or pawn
  if (move.piece === 'q' && capturedVal < 9 && capturedVal > 0) {
    try {
      const cAfter = new Chess(fenAfter);
      const enemyMoves = cAfter.moves({ verbose: true });
      const canBeCaptured = enemyMoves.some((m) => m.to === move.to);
      if (canBeCaptured) return true;
    } catch (e) {}
  }

  // Case 3: Move piece directly into an attacked square where enemy can take it (hanging / en prise)
  try {
    const cAfter = new Chess(fenAfter);
    const enemyMoves = cAfter.moves({ verbose: true });
    const attackers = enemyMoves.filter((m) => m.to === move.to);
    if (attackers.length > 0) {
      const hasLesserOrEqualAttacker = attackers.some(
        (a) => (PIECE_VALUES[a.piece] || 0) <= pieceVal
      );
      if (hasLesserOrEqualAttacker && pieceVal >= 3) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

// Classify a single move with normalized White POV
export function classifyMove({
  move,
  turn,
  prevEval,
  currEval,
  bestMove,
  isSacrifice,
  isBook,
}) {
  if (isBook) {
    return MOVE_CLASSIFICATIONS.BOOK;
  }

  const isWhite = turn === 'w';

  // Normalize evaluations to POV of the player who moved (+ means player is winning)
  const prevPlayerCp = isWhite ? prevEval.whiteCp : -prevEval.whiteCp;
  const currPlayerCp = isWhite ? currEval.whiteCp : -currEval.whiteCp;

  // Win probability from POV of the player who moved
  const prevPlayerWinProb = isWhite ? prevEval.winProb : (100 - prevEval.winProb);
  const currPlayerWinProb = isWhite ? currEval.winProb : (100 - currEval.winProb);

  const movePlayedUci = (move.from || '') + (move.to || '') + (move.promotion || '').toLowerCase();
  const isTopEngine = bestMove && movePlayedUci && (bestMove.toLowerCase() === movePlayedUci.toLowerCase());

  // Loss calculations: if played top engine move, cpLoss is 0
  const cpLoss = isTopEngine ? 0 : Math.max(0, prevPlayerCp - currPlayerCp);
  const winProbLoss = isTopEngine ? 0 : Math.max(0, prevPlayerWinProb - currPlayerWinProb);

  // 1. Brilliant: Piece sacrifice that maintained winning advantage
  if (isSacrifice && cpLoss <= 15 && (currPlayerCp >= 120 || currEval.whiteMate !== null)) {
    return MOVE_CLASSIFICATIONS.BRILLIANT;
  }

  // 2. Great move: Finding a vital resource from a bad position or sharp winning tactic
  const isComeback = prevPlayerCp <= -90 && currPlayerCp >= -20 && cpLoss <= 12;
  const isSharpTactical = prevPlayerCp >= 120 && currPlayerCp >= 280 && isTopEngine;
  if ((isComeback || isSharpTactical) && !isSacrifice) {
    return MOVE_CLASSIFICATIONS.GREAT;
  }

  // 3. Best move
  if (isTopEngine || cpLoss <= 12) {
    return MOVE_CLASSIFICATIONS.BEST;
  }

  // 4. Miss: Had a winning advantage (>= 200 cp or mate) and threw it away
  if (prevPlayerCp >= 200 && (cpLoss >= 160 || winProbLoss >= 16) && currPlayerCp < 120) {
    return MOVE_CLASSIFICATIONS.MISS;
  }

  // 5. Blunder: Severe error
  if (winProbLoss >= 22 || cpLoss >= 260) {
    return MOVE_CLASSIFICATIONS.BLUNDER;
  }

  // 6. Mistake
  if (winProbLoss >= 12 || cpLoss >= 130) {
    return MOVE_CLASSIFICATIONS.MISTAKE;
  }

  // 7. Inaccuracy
  if (winProbLoss >= 6 || cpLoss >= 60) {
    return MOVE_CLASSIFICATIONS.INACCURACY;
  }

  // 8. Excellent
  if (cpLoss <= 28 && winProbLoss <= 3) {
    return MOVE_CLASSIFICATIONS.EXCELLENT;
  }

  // 9. Good
  return MOVE_CLASSIFICATIONS.GOOD;
}

// Generate authentic Chess.com style Coach Commentary
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
}) {
  const isWhite = turn === 'w';
  const player = isWhite ? 'White' : 'Black';
  const opponent = isWhite ? 'Black' : 'White';
  const pieceName = (move && move.piece && PIECE_NAMES[move.piece]) || 'piece';

  // Check contextual attributes
  const isCastle = san === 'O-O' || san === 'O-O-O';
  const isCheck = san.includes('+');
  const isMate = san.includes('#');
  const isCapture = san.includes('x');
  const capturedPiece = move && move.captured ? PIECE_NAMES[move.captured] : null;

  // Detect potential hanging piece
  const hanging = fenAfter ? detectHangingPiece(fenAfter, turn) : null;

  switch (classification.id) {
    case 'brilliant':
      return `Brilliant move! You offered a tactical ${pieceName} sacrifice that cracks open ${opponent}'s defense and launches a decisive winning assault.`;

    case 'great':
      if (isCheck) {
        return `A tremendous move! Delivers a crucial check that forces ${opponent}'s king into danger and seizes the initiative.`;
      }
      return `A great move! You found the only tactical resource in this sharp position to maintain your advantage.`;

    case 'best':
      if (isMate) {
        return `Checkmate! A clean and accurate finish to seal the victory.`;
      }
      if (isCastle) {
        return `The best move! Tucking the king into safety and bringing the rook into active middle-game play.`;
      }
      if (isCapture && capturedPiece) {
        return `The best move! Capturing ${opponent}'s ${capturedPiece} maintains optimal piece coordination and central pressure.`;
      }
      if (isCheck) {
        return `The best move! Delivers an active check that restricts ${opponent}'s piece mobility.`;
      }
      return `The best move! This maximizes piece activity and keeps full pressure on the critical files and squares.`;

    case 'excellent':
      if (isCastle) {
        return `An excellent choice! Solidifying your king's shelter and connecting the rooks.`;
      }
      if (isCapture && capturedPiece) {
        return `An excellent capture! Removing ${opponent}'s ${capturedPiece} simplifies into a very favorable setup.`;
      }
      return `An excellent move! Maintaining your strong position and shutting down counterplay from ${opponent}.`;

    case 'good':
      if (isCapture) {
        return `A solid capture. The position remains balanced and both sides continue the struggle for key outposts.`;
      }
      if (isCheck) {
        return `Delivers a check to test ${opponent}'s defenses while keeping your position solid.`;
      }
      return `A solid, playable move. You continue natural development and contest control of the center.`;

    case 'book':
      return `Book move. This follows recognized grandmaster theory in this opening line.`;

    case 'inaccuracy':
      if (bestMoveSan) {
        return `An inaccuracy. A sharper idea was ${bestMoveSan}, which would have exerted more pressure on ${opponent}.`;
      }
      return `An inaccuracy. This lets ${opponent} off the hook and gives them a chance to equalize.`;

    case 'mistake':
      if (hanging) {
        return `A noticeable mistake. This leaves your ${hanging.piece} on ${hanging.square} vulnerable. Better was ${bestMoveSan || 'a developing move'}.`;
      }
      if (bestMoveSan) {
        return `A noticeable mistake. You conceded the initiative; playing ${bestMoveSan} was much more active and solid.`;
      }
      return `A mistake that hands over dynamic counterplay to ${opponent}.`;

    case 'miss':
      if (bestMoveSan) {
        return `A missed opportunity! You had a decisive winning tactic with ${bestMoveSan}, but overlooked it.`;
      }
      return `Missed win! There was a winning tactical breakthrough on the board that slipped away.`;

    case 'blunder':
      if (hanging) {
        return `A critical blunder! This leaves your ${hanging.piece} on ${hanging.square} undefended, which ${opponent} can punish immediately. Best was ${bestMoveSan}.`;
      }
      if (bestMoveSan) {
        return `A severe blunder! This damages your position and swings the game in ${opponent}'s favor. Best was ${bestMoveSan}.`;
      }
      return `A critical blunder! This turns the evaluation completely in ${opponent}'s favor.`;

    default:
      return `Played ${san}.`;
  }
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

  // Deep Stockfish evaluation (Depth 16 for grandmaster-level tactical comprehension)
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
    const evalData = await stockfishService.evaluatePosition({ fen, depth });
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
      pv: evalData ? evalData.pv : '',
      depth: evalData ? evalData.depth : depth,
    });
  }

  const classifiedMoves = [];
  let whiteAccuracySum = 0;
  let whiteMoveCount = 0;
  let blackAccuracySum = 0;
  let blackMoveCount = 0;

  const stats = {
    w: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    b: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
  };

  for (let i = 0; i < normalizedMoves.length; i++) {
    const move = normalizedMoves[i];
    const prevEval = evaluations[i] || { whiteCp: 0, winProb: 50 };
    const currEval = evaluations[i + 1] || { whiteCp: 0, winProb: 50 };
    const turn = move.color || (i % 2 === 0 ? 'w' : 'b');
    const isWhite = turn === 'w';

    const isBook = isBookMove(historyUci, i);

    const movePlayedUci = (move.from || '') + (move.to || '') + (move.promotion || '').toLowerCase();
    const isTopEngine = prevEval.bestMove && movePlayedUci && (prevEval.bestMove.toLowerCase() === movePlayedUci);

    const prevPlayerCp = isWhite ? prevEval.whiteCp : -prevEval.whiteCp;
    const currPlayerCp = isWhite ? currEval.whiteCp : -currEval.whiteCp;
    const cpLoss = isTopEngine ? 0 : Math.max(0, prevPlayerCp - currPlayerCp);

    const isSacrifice = detectSacrifice(fens[i], fens[i + 1], move, isTopEngine, cpLoss);

    const classification = classifyMove({
      move,
      turn,
      prevEval,
      currEval,
      bestMove: prevEval.bestMove,
      isSacrifice,
      isBook,
    });

    if (stats[turn][classification.id] !== undefined) {
      stats[turn][classification.id]++;
    }

    // CAPS accuracy modeling via exponential win probability loss
    const prevProb = isWhite ? prevEval.winProb : 100 - prevEval.winProb;
    const currProb = isWhite ? currEval.winProb : 100 - currEval.winProb;
    const winProbLoss = isTopEngine ? 0 : Math.max(0, prevProb - currProb);

    // Chess.com CAPS2 formula: 103.1668 * e^(-0.04354 * winProbLoss) - 3.1669
    let moveAccuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winProbLoss) - 3.1669));
    if (isTopEngine || classification.id === 'brilliant' || classification.id === 'great') {
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
