// Complete, High-Precision Chess Analysis Engine in pure JavaScript
// Built purely on local Stockfish 18 WASM with algorithms from antigravity_helpers/analysis.ts and classification.ts
import { Chess } from 'chess.js';
import {
  Classification,
  classificationValues,
  centipawnClassifications,
  getEvaluationLossThreshold,
  CLASSIFICATION_INFO,
  pieceValues,
  promotions,
  getAttackers,
  isPieceHanging,
} from './classification.js';
import { OPENINGS, isBookMove, detectOpeningName, getOpeningFromFen } from './openings.js';
import { stockfishService } from './stockfishService.js';

export { Classification, CLASSIFICATION_INFO, CLASSIFICATION_INFO as MOVE_CLASSIFICATIONS };

// Convert centipawns (from White POV) to win probability (0 to 100)
export function cpToWinProb(whiteCp) {
  if (whiteCp === null || whiteCp === undefined) return 50;
  const clamped = Math.max(-2000, Math.min(2000, whiteCp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

// Helper to convert UCI move string like "e2e4" to SAN "e4"
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

// Full Position Classifier faithfully matching antigravity_helpers/analysis.ts & classification.ts
export function analysePositions(positions) {
  let positionIndex = 0;

  for (const position of positions.slice(1)) {
    positionIndex++;
    const board = new Chess(position.fen);
    const lastPosition = positions[positionIndex - 1];

    let topMove = lastPosition.topLines.find((line) => line.id === 1) || lastPosition.topLines[0];
    const secondTopMove = lastPosition.topLines.find((line) => line.id === 2);
    if (!topMove) {
      topMove = {
        id: 1,
        depth: lastPosition.depth || 1,
        evaluation: { type: 'cp', value: lastPosition.whiteCp ?? 0 },
        moveUCI: position.move?.uci || '',
      };
      lastPosition.topLines.push(topMove);
    }

    const previousEvaluation = topMove.evaluation || { type: 'cp', value: lastPosition.whiteCp ?? 0 };
    let evaluation = position.topLines.find((line) => line.id === 1)?.evaluation || position.topLines[0]?.evaluation;

    const moveColour = position.fen.includes(' b ') ? 'white' : 'black';

    // If there are no legal moves in this position, game is in terminal state
    if (!evaluation) {
      evaluation = {
        type: board.isCheckmate() ? 'mate' : 'cp',
        value: board.isCheckmate() ? (moveColour === 'white' ? 10000 : -10000) : 0,
      };
      position.topLines.push({
        id: 1,
        depth: 0,
        evaluation,
        moveUCI: '',
      });
    }

    const absoluteEvaluation = evaluation.value * (moveColour === 'white' ? 1 : -1);
    const previousAbsoluteEvaluation = previousEvaluation.value * (moveColour === 'white' ? 1 : -1);
    const absoluteSecondEvaluation = (secondTopMove?.evaluation?.value ?? 0) * (moveColour === 'white' ? 1 : -1);

    // Calculate evaluation loss as a result of this move (matching analysis.ts)
    let evalLoss = Infinity;
    let cutoffEvalLoss = Infinity;
    let lastLineEvalLoss = Infinity;

    const matchingTopLine = lastPosition.topLines.find((line) =>
      line.moveUCI && position.move?.uci && line.moveUCI.toLowerCase() === position.move.uci.toLowerCase()
    );

    if (matchingTopLine) {
      if (moveColour === 'white') {
        lastLineEvalLoss = previousEvaluation.value - matchingTopLine.evaluation.value;
      } else {
        lastLineEvalLoss = matchingTopLine.evaluation.value - previousEvaluation.value;
      }
    }

    if (lastPosition.cutoffEvaluation) {
      if (moveColour === 'white') {
        cutoffEvalLoss = lastPosition.cutoffEvaluation.value - evaluation.value;
      } else {
        cutoffEvalLoss = evaluation.value - lastPosition.cutoffEvaluation.value;
      }
    }

    if (moveColour === 'white') {
      evalLoss = previousEvaluation.value - evaluation.value;
    } else {
      evalLoss = evaluation.value - previousEvaluation.value;
    }

    evalLoss = Math.min(evalLoss, cutoffEvalLoss, lastLineEvalLoss);
    position.evalLoss = Math.max(0, evalLoss);

    // 1. If only one legal move was available on the board, classification is FORCED (matching analysis.ts line 85)
    let isForced = false;
    try {
      const prevBoard = new Chess(lastPosition.fen);
      isForced = prevBoard.moves().length === 1;
    } catch (e) {
      isForced = !secondTopMove;
    }

    if (isForced) {
      position.classification = Classification.FORCED;
      continue;
    }

    const noMate = previousEvaluation.type === 'cp' && evaluation.type === 'cp';

    // 2. Check if the player played the engine's #1 move or tied with top line
    const isTopEngineMove = Boolean(
      topMove &&
      topMove.moveUCI &&
      position.move?.uci &&
      topMove.moveUCI.toLowerCase() === position.move.uci.toLowerCase()
    );

    const isTiedWithTop = Boolean(
      matchingTopLine &&
      topMove &&
      matchingTopLine.evaluation?.type === 'cp' &&
      topMove.evaluation?.type === 'cp' &&
      Math.abs(matchingTopLine.evaluation.value - topMove.evaluation.value) <= 3
    );

    const isTopLine = isTopEngineMove || isTiedWithTop;

    if (isTopLine) {
      position.classification = Classification.BEST;
    } else {
      // 3. Check for Miss (squandering a decisive advantage: +200 cp or mate down to < +100 cp)
      const hadWinningPosition = (previousEvaluation.type === 'mate' && previousAbsoluteEvaluation > 0) ||
        (previousEvaluation.type === 'cp' && previousAbsoluteEvaluation >= 200);
      const lostAdvantage = (evaluation.type === 'mate' && absoluteEvaluation < 0) ||
        (evaluation.type === 'cp' && absoluteEvaluation < 100);

      if (hadWinningPosition && lostAdvantage && evalLoss >= 150) {
        position.classification = Classification.MISS;
      }
      // 4. Mate blundered: was cp last move, now opponent has forced mate
      else if (previousEvaluation.type === 'cp' && evaluation.type === 'mate') {
        if (absoluteEvaluation > 0) {
          position.classification = Classification.EXCELLENT;
        } else if (absoluteEvaluation >= -2) {
          position.classification = Classification.BLUNDER;
        } else if (absoluteEvaluation >= -5) {
          position.classification = Classification.MISTAKE;
        } else {
          position.classification = Classification.INACCURACY;
        }
      }
      // 5. Mate escaped / defended: was mate last move, now cp
      else if (previousEvaluation.type === 'mate' && evaluation.type === 'cp') {
        if (previousAbsoluteEvaluation < 0 && absoluteEvaluation < 0) {
          position.classification = Classification.EXCELLENT;
        } else if (absoluteEvaluation >= 400) {
          position.classification = Classification.GOOD;
        } else if (absoluteEvaluation >= 150) {
          position.classification = Classification.INACCURACY;
        } else if (absoluteEvaluation >= -100) {
          position.classification = Classification.MISTAKE;
        } else {
          position.classification = Classification.BLUNDER;
        }
      }
      // 6. Mate maintained or accelerated
      else if (previousEvaluation.type === 'mate' && evaluation.type === 'mate') {
        if (previousAbsoluteEvaluation > 0) {
          if (absoluteEvaluation <= -4) {
            position.classification = Classification.MISTAKE;
          } else if (absoluteEvaluation < 0) {
            position.classification = Classification.BLUNDER;
          } else if (absoluteEvaluation < previousAbsoluteEvaluation) {
            position.classification = Classification.BEST;
          } else if (absoluteEvaluation <= previousAbsoluteEvaluation + 2) {
            position.classification = Classification.EXCELLENT;
          } else {
            position.classification = Classification.GOOD;
          }
        } else {
          position.classification = Classification.GOOD;
        }
      }
      // 7. Non-top move evaluation loss thresholds (EXCELLENT, GOOD, INACCURACY, MISTAKE, BLUNDER)
      else if (noMate) {
        let assignedClassif = Classification.BLUNDER;
        for (const classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, previousEvaluation.value)) {
            assignedClassif = classif;
            break;
          }
        }
        position.classification = assignedClassif;
      }
    }

    // 7. Test for Brilliant Move (Sound Tactical Material Sacrifice from analysis.ts lines 159-251)
    const isTopMove = position.classification === Classification.BEST ||
      (topMove.moveUCI && position.move?.uci && topMove.moveUCI.toLowerCase() === position.move.uci.toLowerCase());

    if (isTopMove) {
      // Must be winning or equal for the side that played the brilliancy
      // If the move leads to forced checkmate, it is ALWAYS an eligible brilliancy candidate!
      const isMatingAttack = (topMove.evaluation.type === 'mate' && absoluteEvaluation > 0);
      const winningAnyways = !isMatingAttack && (
        (absoluteSecondEvaluation >= 650 && topMove.evaluation.type === 'cp') ||
        (secondTopMove?.evaluation?.type === 'mate' && Math.abs(secondTopMove.evaluation.value) <= 2 && Math.abs(topMove.evaluation.value) >= Math.abs(secondTopMove.evaluation.value))
      );

      if ((absoluteEvaluation >= 0 || isMatingAttack) && !winningAnyways) {
        const lastBoard = new Chess(lastPosition.fen);
        const currentBoard = new Chess(position.fen);

        if (!lastBoard.inCheck()) {
          const moveTo = position.move.uci.slice(2, 4);
          const lastPiece = lastBoard.get(moveTo) || { type: 'm' };
          const movedPiece = currentBoard.get(moveTo);

          const sacrificedPieces = [];
          for (const row of currentBoard.board()) {
            for (const piece of row) {
              if (!piece) continue;
              if (piece.color !== moveColour.charAt(0)) continue;
              if (piece.type === 'k' || piece.type === 'p') continue;

              // If candidate piece is the piece that just moved
              if (piece.square === moveTo) {
                // Must not have traded for a piece of greater or equal value
                if ((pieceValues[lastPiece.type] || 0) >= (pieceValues[piece.type] || 0)) {
                  continue;
                }
              }

              // Check if piece is hanging/sacrificed in current position
              if (isPieceHanging(lastPosition.fen, position.fen, piece.square)) {
                if ((pieceValues[lastPiece.type] || 0) < (pieceValues[piece.type] || 0)) {
                  position.classification = Classification.BRILLIANT;
                  sacrificedPieces.push(piece);
                }
              }
            }
          }

          // Rigorous counter-attacker simulation:
          // Check that the sacrificed piece can legally be captured by the opponent
          // without every capture immediately losing a pinned equal/higher piece
          if (sacrificedPieces.length > 0) {
            let anyPieceViablyCapturable = false;

            for (const piece of sacrificedPieces) {
              const attackers = getAttackers(position.fen, piece.square);

              for (const attacker of attackers) {
                for (const promotion of promotions) {
                  try {
                    const captureTestBoard = new Chess(position.fen);
                    const moveRes = captureTestBoard.move({
                      from: attacker.square,
                      to: piece.square,
                      promotion,
                    });
                    if (!moveRes) continue;

                    let attackerPinned = false;
                    for (const row of captureTestBoard.board()) {
                      for (const enemyPiece of row) {
                        if (!enemyPiece) continue;
                        if (enemyPiece.color === captureTestBoard.turn() || enemyPiece.type === 'k') continue;

                        const maxSackVal = Math.max(...sacrificedPieces.map((sack) => pieceValues[sack.type] || 0));
                        if (
                          isPieceHanging(position.fen, captureTestBoard.fen(), enemyPiece.square) &&
                          (pieceValues[enemyPiece.type] || 0) >= maxSackVal
                        ) {
                          attackerPinned = true;
                          break;
                        }
                      }
                      if (attackerPinned) break;
                    }

                    // If attacker is not pinned to an equal or higher piece, capture is viable
                    if (!attackerPinned) {
                      anyPieceViablyCapturable = true;
                      break;
                    }
                  } catch (e) {}
                }
                if (anyPieceViablyCapturable) break;
              }
              if (anyPieceViablyCapturable) break;
            }

            if (!anyPieceViablyCapturable) {
              position.classification = Classification.BEST;
            }
          }
        }
      }

      // 8. Test for Great Move (Sole finding resource after opponent error from analysis.ts lines 253-263)
      const moveTo = position.move.uci.slice(2, 4);
      const evalGap = secondTopMove?.evaluation?.value !== undefined
        ? Math.abs(topMove.evaluation.value - secondTopMove.evaluation.value)
        : 0;

      if (
        noMate &&
        position.classification !== Classification.BRILLIANT &&
        secondTopMove &&
        evalGap >= 150 &&
        (lastPosition.classification === Classification.BLUNDER ||
         lastPosition.classification === Classification.MISTAKE ||
         evalGap >= 200) &&
        !isPieceHanging(lastPosition.fen, position.fen, moveTo)
      ) {
        position.classification = Classification.GREAT;
      }
    }

    // 9. Do not allow blunder if move still completely winning (>= +6.00) (analysis.ts lines 265-268)
    if (position.classification === Classification.BLUNDER && absoluteEvaluation >= 600) {
      position.classification = Classification.GOOD;
    }

    // 10. Do not allow blunder if you were already in a completely lost position (<= -6.00) (analysis.ts lines 270-273)
    if (position.classification === Classification.BLUNDER && previousAbsoluteEvaluation <= -600) {
      position.classification = Classification.GOOD;
    }

    // 11. Detect Miss (opponent blundered and player played inaccuracy/mistake instead of punishing)
    if (
      lastPosition.classification === Classification.BLUNDER &&
      (position.classification === Classification.INACCURACY || position.classification === Classification.MISTAKE)
    ) {
      position.classification = Classification.MISS;
    }

    position.classification = position.classification || Classification.GOOD;
  }

  // Generate opening names for each position using antigravity_helpers/openings.json
  const historyUci = positions.slice(1).map((p) => p.move.uci);
  let latestKnownOpening = null;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const directOpening = getOpeningFromFen(pos.fen);
    if (directOpening) {
      latestKnownOpening = directOpening;
      pos.hasNamedOpening = true;
    }
    pos.opening = latestKnownOpening || (i === 0 ? 'Starting Position' : null);
  }

  const detectedGameOpening = detectOpeningName(historyUci, positions[positions.length - 1]?.fen);

  // Apply book moves strictly within the opening phase (first 10 moves / 20 plies)
  // NEVER overwrite Brilliant or Great moves, and terminate book moves as soon as out of theory!
  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i];
    const moveNumber = Math.floor((i - 1) / 2) + 1;

    // Never convert a brilliant or great move into a book move
    if (pos.classification === Classification.BRILLIANT || pos.classification === Classification.GREAT) {
      break;
    }

    // Book moves only exist in the opening (first 10 full moves)
    if (moveNumber > 10) {
      break;
    }

    // Must be in recognized opening theory
    const isTheory = pos.hasNamedOpening || isBookMove(historyUci, i - 1, pos.fen);

    // Must be a playable opening move
    const isSolidMove = [
      Classification.BEST,
      Classification.EXCELLENT,
      Classification.GOOD,
    ].includes(pos.classification);

    if (isTheory && isSolidMove) {
      pos.classification = Classification.BOOK;
    } else {
      // Once a player deviates or makes an inaccuracy/mistake, book moves end
      break;
    }
  }

  // Generate SAN moves from all engine lines (used for suggestion cards)
  for (const position of positions) {
    for (const line of position.topLines) {
      if (line.evaluation.type === 'mate' && line.evaluation.value === 0) continue;
      try {
        const board = new Chess(position.fen);
        line.moveSAN = board.move({
          from: line.moveUCI.slice(0, 2),
          to: line.moveUCI.slice(2, 4),
          promotion: line.moveUCI.slice(4) || undefined,
        })?.san || '';
      } catch (e) {
        line.moveSAN = '';
      }
    }
  }

  // Calculate computer accuracy percentages and ACPL (Average Centipawn Loss)
  const accuracies = {
    white: { current: 0, maximum: 0, cpLossSum: 0, count: 0 },
    black: { current: 0, maximum: 0, cpLossSum: 0, count: 0 },
  };

  const stats = {
    w: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    b: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
  };

  for (const position of positions.slice(1)) {
    const moveColour = position.fen.includes(' b ') ? 'white' : 'black';
    const sideKey = moveColour === 'white' ? 'w' : 'b';
    const classif = position.classification || Classification.GOOD;

    const weight = classificationValues[classif] ?? 0.7;
    accuracies[moveColour].current += weight;
    accuracies[moveColour].maximum++;

    if (stats[sideKey][classif] !== undefined) {
      stats[sideKey][classif]++;
    }

    const loss = typeof position.evalLoss === 'number' && !isNaN(position.evalLoss) ? Math.min(600, position.evalLoss) : 0;
    accuracies[moveColour].cpLossSum += loss;
    accuracies[moveColour].count++;
  }

  const whiteAccuracy = accuracies.white.maximum > 0
    ? Math.round((accuracies.white.current / accuracies.white.maximum) * 1000) / 10
    : 100;
  const blackAccuracy = accuracies.black.maximum > 0
    ? Math.round((accuracies.black.current / accuracies.black.maximum) * 1000) / 10
    : 100;

  const whiteACPL = accuracies.white.count > 0 ? Math.round(accuracies.white.cpLossSum / accuracies.white.count) : 20;
  const blackACPL = accuracies.black.count > 0 ? Math.round(accuracies.black.cpLossSum / accuracies.black.count) : 20;

  return {
    accuracies: {
      white: whiteAccuracy,
      black: blackAccuracy,
    },
    acpl: {
      white: whiteACPL,
      black: blackACPL,
    },
    stats,
    opening: detectedGameOpening,
    positions,
  };
}

// Generate Game Narrative Summary
export function generateGameComment({ positions, stats, accuracies, acpl, whitePlayer = 'White', blackPlayer = 'Black' }) {
  const totalMoves = positions.length - 1;
  if (totalMoves <= 0) return { title: 'Opening Balance', text: 'No moves played yet.' };

  const wBlunders = stats.w.blunder;
  const bBlunders = stats.b.blunder;
  const wBrilliants = stats.w.brilliant;
  const bBrilliants = stats.b.brilliant;

  const keyEvents = [];
  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i];
    const isWhite = pos.fen.includes(' b ');
    const player = isWhite ? whitePlayer : blackPlayer;
    const moveNum = Math.ceil(i / 2);

    if (pos.classification === Classification.BRILLIANT) {
      keyEvents.push(`On move ${moveNum}, ${player} played a brilliant sacrifice with ${pos.move.san || pos.move.uci}.`);
    } else if (pos.classification === Classification.GREAT) {
      keyEvents.push(`On move ${moveNum}, ${player} found the critical continuation ${pos.move.san || pos.move.uci}.`);
    } else if (pos.classification === Classification.BLUNDER && keyEvents.length < 3) {
      keyEvents.push(`The tide shifted on move ${moveNum} when ${player}'s ${pos.move.san || pos.move.uci} conceded an opportunity.`);
    }
  }

  let title = 'Balanced Strategic Battle';
  if (wBrilliants > 0 || bBrilliants > 0) {
    title = 'Masterful Tactical Brilliancy';
  } else if (wBlunders > 0 && bBlunders > 0) {
    title = 'Sharp Exchange Thriller';
  } else if (accuracies.white >= 85 && accuracies.black >= 85) {
    title = 'High-Precision Masterclass';
  } else if (wBlunders + bBlunders >= 3) {
    title = 'Rollercoaster Tactical Fight';
  }

  let text = '';
  if (keyEvents.length > 0) {
    text = keyEvents.slice(0, 3).join(' ') + ` Over ${totalMoves} moves, White achieved ${accuracies.white}% accuracy (ACPL ${acpl.white}) and Black ${accuracies.black}% accuracy (ACPL ${acpl.black}).`;
  } else {
    text = `A solid game with clean strategic play. White achieved ${accuracies.white}% accuracy, while Black countered with ${accuracies.black}% accuracy.`;
  }

  return { title, text };
}

// Generate Coach Explanation for a Move
export function generateCoachExplanation(pos, prevPos) {
  if (!pos || !pos.classification) return 'A standard move.';
  const classif = pos.classification;
  const san = pos.move?.san || pos.move?.uci || 'Move';
  const bestSan = prevPos?.topLines?.[0]?.moveSAN;

  switch (classif) {
    case Classification.BRILLIANT:
      return `Brilliant move! You offered an intentional piece sacrifice that keeps a winning advantage and cracks open the enemy structure.`;
    case Classification.GREAT:
      return `A great move! You found the only tactical continuation that punishes your opponent's error.`;
    case Classification.BEST:
      return `The best move! Optimal piece placement according to the engine.`;
    case Classification.EXCELLENT:
      return `An excellent choice, keeping strong central control and initiative.`;
    case Classification.GOOD:
      return `A solid move, though other tactical opportunities were available.`;
    case Classification.BOOK:
      return `Standard opening book theory.`;
    case Classification.FORCED:
      return `This was the only legal move available on the board.`;
    case Classification.INACCURACY:
      return `An inaccuracy. This gave up some initiative.${bestSan ? ` Better was ${bestSan}.` : ''}`;
    case Classification.MISTAKE:
      return `A noticeable mistake that compromises piece coordination.${bestSan ? ` Better was ${bestSan}.` : ''}`;
    case Classification.MISS:
      return `A missed opportunity! You had a chance to seize a decisive advantage.${bestSan ? ` Stronger was ${bestSan}.` : ''}`;
    case Classification.BLUNDER:
      return `A critical blunder that drastically shifts the evaluation.${bestSan ? ` The best move was ${bestSan}.` : ''}`;
    default:
      return `Played ${san}.`;
  }
}

// Full Game Review Runner (100% Local Stockfish 18 WASM Worker)
export async function analyzeFullGame(moves, onProgress, options = {}) {
  const depthParam = typeof options === 'number' ? options : (options.depth || 10);
  const whitePlayer = typeof options === 'object' && options.whitePlayer ? options.whitePlayer : 'White';
  const blackPlayer = typeof options === 'object' && options.blackPlayer ? options.blackPlayer : 'Black';

  const chess = new Chess();
  const fens = [chess.fen()];
  const normalizedMoves = [];

  for (const m of moves) {
    const moveParam = typeof m === 'string' ? m : m.san || { from: m.from, to: m.to, promotion: m.promotion || 'q' };
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
    fens.push(chess.fen());
  }

  const total = fens.length;
  const positions = [];

  // Step 1: Pre-populate positions array
  for (let i = 0; i < total; i++) {
    const fen = fens[i];
    const movePlayed = i > 0 ? normalizedMoves[i - 1] : null;
    const moveUci = movePlayed ? movePlayed.from + movePlayed.to + (movePlayed.promotion || '') : '';

    positions.push({
      fen,
      move: {
        uci: moveUci,
        san: movePlayed ? movePlayed.san : '',
        from: movePlayed ? movePlayed.from : '',
        to: movePlayed ? movePlayed.to : '',
      },
      topLines: [],
      worker: 'stockfish',
      depth: 0,
      classification: null,
      opening: null,
    });
  }

  // Step 2: Evaluation Loop using dedicated local Stockfish 18 WASM engine
  let analysisWorker = null;
  try {
    analysisWorker = stockfishService.createAnalysisWorker();
  } catch (e) {
    analysisWorker = null;
  }

  if (analysisWorker) {
    try {
      analysisWorker.postMessage('uci');
      analysisWorker.postMessage('setoption name Skill Level value 20');
      analysisWorker.postMessage('setoption name UCI_LimitStrength value false');
      analysisWorker.postMessage('setoption name MultiPV value 2');
      analysisWorker.postMessage('isready');

      await new Promise((res) => {
        let timer = null;
        const onReady = (e) => {
          const line = typeof e.data === 'string' ? e.data : (e.data?.line || '');
          if (line.includes('readyok') || line.includes('uciok')) {
            clearTimeout(timer);
            analysisWorker.removeEventListener('message', onReady);
            res();
          }
        };
        analysisWorker.addEventListener('message', onReady);
        timer = setTimeout(() => {
          analysisWorker.removeEventListener('message', onReady);
          res();
        }, 1500);
      });
    } catch (e) {
      console.warn('Dedicated worker init warning:', e);
    }
  }

  for (let i = 0; i < total; i++) {
    const pos = positions[i];
    const currentMove = i > 0 ? normalizedMoves[i - 1] : null;

    if (onProgress) {
      onProgress({
        step: 'evaluating',
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        san: currentMove ? currentMove.san : 'Start',
      });
    }

    const testBoard = new Chess(pos.fen);

    // Terminal state check (checkmate / stalemate)
    if (testBoard.isGameOver()) {
      const isCheckmate = testBoard.isCheckmate();
      const whiteWon = isCheckmate && testBoard.turn() === 'b';

      pos.topLines = [
        {
          id: 1,
          depth: 0,
          evaluation: {
            type: isCheckmate ? 'mate' : 'cp',
            value: isCheckmate ? (whiteWon ? 10000 : -10000) : 0,
          },
          moveUCI: '',
          moveSAN: '',
        },
      ];
      pos.depth = 0;
      pos.worker = 'terminal';
      continue;
    }

    let evalResult = null;

    if (analysisWorker) {
      evalResult = await new Promise((resolve) => {
        let resolved = false;
        const topMovesMap = {};
        let lastDepth = 0;
        let whiteCp = 0;
        let whiteMate = null;
        let bestMoveUci = null;
        let bestPv = '';

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            analysisWorker.removeEventListener('message', handleMsg);
            resolve(buildResult());
          }
        }, Math.max(2500, depthParam * 250));

        const buildResult = () => {
          const topMovesList = Object.values(topMovesMap).sort((a, b) => a.multipv - b.multipv);
          return {
            worker: 'stockfish',
            depth: lastDepth || depthParam,
            bestMove: bestMoveUci || topMovesList[0]?.uci || null,
            whiteCp,
            whiteMate,
            topLines: topMovesList.length > 0
              ? topMovesList.map((tm) => ({
                  id: tm.multipv,
                  depth: tm.depth,
                  evaluation: {
                    type: tm.whiteMate !== null ? 'mate' : 'cp',
                    value: tm.whiteMate !== null ? tm.whiteMate : tm.whiteCp,
                  },
                  moveUCI: tm.uci,
                  pv: tm.pv,
                }))
              : null,
          };
        };

        const handleMsg = (e) => {
          if (resolved) return;
          const line = typeof e.data === 'string' ? e.data : (e.data?.line || '');

          if (line.startsWith('info') && line.includes('score')) {
            const depthMatch = line.match(/depth (\d+)/);
            const mpvMatch = line.match(/multipv (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/pv (.+)/);

            const mpvIndex = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;
            const currentDepth = depthMatch ? parseInt(depthMatch[1], 10) : 0;
            let rawCp = 0;
            let rawMate = null;

            if (cpMatch) rawCp = parseInt(cpMatch[1], 10);
            if (mateMatch) rawMate = parseInt(mateMatch[1], 10);

            let firstMove = null;
            let pvString = '';
            if (pvMatch) {
              pvString = pvMatch[1];
              firstMove = pvMatch[1].split(' ')[0];
            }

            if (firstMove && firstMove.length >= 4) {
              const isWhiteTurn = pos.fen.split(' ')[1] === 'w';
              const moveWhiteCp = isWhiteTurn ? rawCp : -rawCp;
              const moveWhiteMate = rawMate !== null ? (isWhiteTurn ? rawMate : -rawMate) : null;

              if (mpvIndex === 1) {
                lastDepth = currentDepth;
                whiteCp = moveWhiteCp;
                whiteMate = moveWhiteMate;
                bestMoveUci = firstMove;
                bestPv = pvString;
              }

              topMovesMap[mpvIndex] = {
                multipv: mpvIndex,
                uci: firstMove,
                whiteCp: moveWhiteCp,
                whiteMate: moveWhiteMate,
                pv: pvString,
                depth: currentDepth,
              };
            }
          } else if (line.startsWith('bestmove')) {
            if (!resolved) {
              const parts = line.split(' ');
              const moveStr = parts[1];

              if (moveStr === '(none)' && Object.keys(topMovesMap).length === 0) {
                return;
              }

              if (moveStr && moveStr !== '(none)' && moveStr.length >= 4) {
                bestMoveUci = moveStr;
              }
              resolved = true;
              clearTimeout(timer);
              analysisWorker.removeEventListener('message', handleMsg);
              resolve(buildResult());
            }
          }
        };

        analysisWorker.addEventListener('message', handleMsg);
        analysisWorker.postMessage(`position fen ${pos.fen}`);
        analysisWorker.postMessage(`go depth ${depthParam}`);
      });
    } else {
      // Fallback service evaluation if worker not directly available
      const stockfishEval = await stockfishService.evaluatePosition({
        fen: pos.fen,
        depth: depthParam,
        multiPv: 2,
      });

      if (stockfishEval) {
        const rawTopMoves = (stockfishEval.topMoves && stockfishEval.topMoves.length > 0)
          ? stockfishEval.topMoves
          : [
              {
                multipv: 1,
                uci: stockfishEval.bestMove || '',
                whiteCp: stockfishEval.whiteCp || 0,
                whiteMate: stockfishEval.whiteMate,
                pv: stockfishEval.pv || '',
                depth: stockfishEval.depth || depthParam,
              },
            ];

        evalResult = {
          worker: 'stockfish',
          depth: stockfishEval.depth || depthParam,
          bestMove: stockfishEval.bestMove || rawTopMoves[0]?.uci || null,
          whiteCp: stockfishEval.whiteCp || 0,
          whiteMate: stockfishEval.whiteMate,
          topLines: rawTopMoves.map((tm, idx) => ({
            id: tm.multipv || idx + 1,
            depth: tm.depth || depthParam,
            evaluation: {
              type: tm.whiteMate !== null && tm.whiteMate !== undefined ? 'mate' : 'cp',
              value: tm.whiteMate !== null && tm.whiteMate !== undefined ? tm.whiteMate : (tm.whiteCp ?? 0),
            },
            moveUCI: tm.uci || '',
            pv: tm.pv || '',
          })),
        };
      }
    }

    if (evalResult && evalResult.topLines && evalResult.topLines.length > 0) {
      pos.worker = evalResult.worker;
      pos.depth = evalResult.depth;
      pos.topLines = evalResult.topLines;
      pos.bestMove = evalResult.bestMove;
      pos.whiteCp = evalResult.whiteCp;
      pos.whiteMate = evalResult.whiteMate;
    } else {
      // Safe fallback if worker returns null
      const legalMoves = testBoard.moves({ verbose: true });
      const fallbackBest = legalMoves.length > 0
        ? legalMoves[0].from + legalMoves[0].to + (legalMoves[0].promotion || '')
        : (pos.move?.uci || '');

      pos.topLines = [
        {
          id: 1,
          depth: 1,
          evaluation: { type: 'cp', value: 0 },
          moveUCI: fallbackBest,
          moveSAN: legalMoves.length > 0 ? legalMoves[0].san : '',
        },
      ];
      pos.bestMove = fallbackBest;
      pos.whiteCp = 0;
    }
  }

  if (analysisWorker) {
    try {
      analysisWorker.postMessage('quit');
      analysisWorker.terminate();
    } catch (e) {}
  }

  // Step 3: Run Full Tactical Classification based strictly on classification.ts & analysis.ts
  const analysisReport = analysePositions(positions);

  // Step 4: Build enriched classifiedMoves array for UI consumption
  const classifiedMoves = [];
  for (let i = 0; i < normalizedMoves.length; i++) {
    const move = normalizedMoves[i];
    const prevPos = positions[i];
    const currPos = positions[i + 1];
    const classif = currPos.classification || Classification.GOOD;
    const classifInfo = CLASSIFICATION_INFO[classif] || CLASSIFICATION_INFO.good;

    const topLine = currPos.topLines[0] || { evaluation: { type: 'cp', value: 0 } };
    let scoreDisplay = '0.0';
    if (topLine.evaluation.type === 'mate') {
      scoreDisplay = `M${Math.abs(topLine.evaluation.value)}`;
    } else {
      const p = (topLine.evaluation.value / 100).toFixed(2);
      scoreDisplay = topLine.evaluation.value > 0 ? `+${p}` : `${p}`;
    }

    const coachExplanation = generateCoachExplanation(currPos, prevPos);

    // Ensure bestMove and bestMoveSan are legally verified from prevPos.fen
    let verifiedBestUci = null;
    let verifiedBestSan = null;
    let bestMovePv = '';

    for (const tl of (prevPos.topLines || [])) {
      if (tl.moveUCI && tl.moveUCI.length >= 4) {
        try {
          const testBoard = new Chess(prevPos.fen);
          const res = testBoard.move({
            from: tl.moveUCI.substring(0, 2),
            to: tl.moveUCI.substring(2, 4),
            promotion: tl.moveUCI.length > 4 ? tl.moveUCI[4] : undefined,
          });
          if (res) {
            verifiedBestUci = tl.moveUCI;
            verifiedBestSan = res.san;
            bestMovePv = tl.pv || '';
            break;
          }
        } catch (e) {}
      }
    }

    if (!verifiedBestUci) {
      try {
        const testBoard = new Chess(prevPos.fen);
        const legal = testBoard.moves({ verbose: true });
        if (legal.length > 0) {
          verifiedBestUci = legal[0].from + legal[0].to + (legal[0].promotion || '');
          verifiedBestSan = legal[0].san;
        }
      } catch (e) {}
    }

    classifiedMoves.push({
      index: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san || `${move.from}-${move.to}`,
      from: move.from,
      to: move.to,
      fen: currPos.fen,
      prevFen: prevPos.fen,
      classification: classifInfo,
      evalLoss: currPos.evalLoss || 0,
      scoreDisplay,
      bestMove: verifiedBestUci,
      bestMoveSan: verifiedBestSan,
      bestMovePv,
      coachExplanation,
      pv: currPos.topLines[0]?.pv || '',
    });
  }

  const gameComment = generateGameComment({
    positions,
    stats: analysisReport.stats,
    accuracies: analysisReport.accuracies,
    acpl: analysisReport.acpl,
    whitePlayer,
    blackPlayer,
  });

  const evaluations = positions.map((p) => {
    const top = p.topLines?.[0];
    const cpVal = top?.evaluation?.type === 'cp' ? top.evaluation.value : (top?.evaluation?.value > 0 ? 10000 : -10000);
    const mateVal = top?.evaluation?.type === 'mate' ? top.evaluation.value : null;

    let bestMove = p.bestMove || top?.moveUCI || null;
    if (bestMove && bestMove.length >= 4) {
      try {
        const testBoard = new Chess(p.fen);
        const res = testBoard.move({
          from: bestMove.substring(0, 2),
          to: bestMove.substring(2, 4),
          promotion: bestMove.length > 4 ? bestMove[4] : undefined,
        });
        if (!res) {
          bestMove = null;
        }
      } catch (e) {
        bestMove = null;
      }
    }

    if (!bestMove) {
      try {
        const testBoard = new Chess(p.fen);
        for (const tl of (p.topLines || [])) {
          if (tl.moveUCI && tl.moveUCI.length >= 4) {
            const res = testBoard.move({
              from: tl.moveUCI.substring(0, 2),
              to: tl.moveUCI.substring(2, 4),
              promotion: tl.moveUCI.length > 4 ? tl.moveUCI[4] : undefined,
            });
            if (res) {
              bestMove = tl.moveUCI;
              break;
            }
          }
        }
        if (!bestMove) {
          const legal = testBoard.moves({ verbose: true });
          if (legal.length > 0) {
            bestMove = legal[0].from + legal[0].to + (legal[0].promotion || '');
          }
        }
      } catch (e) {}
    }

    return {
      fen: p.fen,
      whiteCp: cpVal,
      whiteMate: mateVal,
      cp: cpVal,
      mate: mateVal,
      bestMove,
      pv: top?.pv || '',
      depth: p.depth || depthParam,
    };
  });

  return {
    positions,
    evaluations,
    classifiedMoves,
    accuracies: analysisReport.accuracies,
    whiteAccuracy: analysisReport.accuracies.white,
    blackAccuracy: analysisReport.accuracies.black,
    whiteEstimatedElo: Math.min(2900, Math.max(600, Math.round(1000 + (analysisReport.accuracies.white - 50) * 35))),
    blackEstimatedElo: Math.min(2900, Math.max(600, Math.round(1000 + (analysisReport.accuracies.black - 50) * 35))),
    acpl: analysisReport.acpl,
    stats: analysisReport.stats,
    opening: analysisReport.opening,
    gameComment,
  };
}
