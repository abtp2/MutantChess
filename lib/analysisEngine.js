// Complete, High-Speed Chess Analysis Engine built from scratch in JavaScript
// Based on antigravity_helpers/analysis.ts and classification.ts with Lichess Cloud Eval acceleration
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
import { OPENINGS, isBookMove, detectOpeningName } from './openings.js';
import { stockfishService } from './stockfishService.js';

export { Classification, CLASSIFICATION_INFO, CLASSIFICATION_INFO as MOVE_CLASSIFICATIONS };

// In-memory cache for cloud evaluations to avoid redundant network calls
const cloudEvalCache = new Map();

// Fetch cloud evaluation from Lichess Public API (depth 40-75)
async function fetchCloudEval(fen) {
  if (cloudEvalCache.has(fen)) {
    return cloudEvalCache.get(fen);
  }

  try {
    const encodedFen = encodeURIComponent(fen);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}&multiPv=2`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      cloudEvalCache.set(fen, null);
      return null;
    }

    const data = await res.json();
    if (!data || !data.pvs || data.pvs.length === 0) {
      cloudEvalCache.set(fen, null);
      return null;
    }

    // Parse PV lines (always White POV from Lichess)
    const topLines = data.pvs.map((pv, idx) => {
      const firstUci = pv.moves ? pv.moves.split(' ')[0] : '';
      let evaluation = { type: 'cp', value: 0 };
      if (pv.mate !== undefined && pv.mate !== null) {
        evaluation = { type: 'mate', value: pv.mate };
      } else if (pv.cp !== undefined && pv.cp !== null) {
        evaluation = { type: 'cp', value: pv.cp };
      }
      return {
        id: idx + 1,
        depth: data.depth || 45,
        evaluation,
        moveUCI: firstUci,
        pv: pv.moves || '',
      };
    });

    const result = {
      worker: 'cloud',
      depth: data.depth || 45,
      topLines,
      bestMove: topLines[0]?.moveUCI || null,
      whiteCp: topLines[0]?.evaluation?.type === 'cp' ? topLines[0].evaluation.value : (topLines[0]?.evaluation?.value > 0 ? 10000 : -10000),
      whiteMate: topLines[0]?.evaluation?.type === 'mate' ? topLines[0].evaluation.value : null,
      pv: topLines[0]?.pv || '',
    };

    cloudEvalCache.set(fen, result);
    return result;
  } catch (e) {
    cloudEvalCache.set(fen, null);
    return null;
  }
}

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

// Full Position Classifier matching antigravity_helpers/analysis.ts
export function analysePositions(positions) {
  let positionIndex = 0;

  for (const position of positions.slice(1)) {
    positionIndex++;
    const board = new Chess(position.fen);
    const lastPosition = positions[positionIndex - 1];

    const topMove = lastPosition.topLines.find((line) => line.id === 1);
    const secondTopMove = lastPosition.topLines.find((line) => line.id === 2);
    if (!topMove) continue;

    const previousEvaluation = topMove.evaluation;
    let evaluation = position.topLines.find((line) => line.id === 1)?.evaluation;
    if (!previousEvaluation) continue;

    const moveColour = position.fen.includes(' b ') ? 'white' : 'black';

    // If terminal state (checkmate or stalemate)
    if (!evaluation) {
      evaluation = { type: board.isCheckmate() ? 'mate' : 'cp', value: 0 };
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

    // Calculate evaluation loss
    let evalLoss = Infinity;
    let cutoffEvalLoss = Infinity;
    let lastLineEvalLoss = Infinity;

    const matchingTopLine = lastPosition.topLines.find((line) => line.moveUCI === position.move.uci);
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

    // 1. If only one legal move was available, classification is FORCED
    if (!secondTopMove) {
      position.classification = Classification.FORCED;
      continue;
    }

    const noMate = previousEvaluation.type === 'cp' && evaluation.type === 'cp';

    // 2. If it matches top engine recommendation, assign BEST
    if (topMove.moveUCI && position.move.uci && topMove.moveUCI.toLowerCase() === position.move.uci.toLowerCase()) {
      position.classification = Classification.BEST;
    } else {
      // 3. Evaluation loss threshold mapping (WTF algorithm)
      if (noMate) {
        for (const classif of centipawnClassifications) {
          if (evalLoss <= getEvaluationLossThreshold(classif, previousEvaluation.value)) {
            position.classification = classif;
            break;
          }
        }
      }
      // 4. Mate blundered: was cp last move, now opponent has forced mate
      else if (previousEvaluation.type === 'cp' && evaluation.type === 'mate') {
        if (absoluteEvaluation > 0) {
          position.classification = Classification.BEST;
        } else if (absoluteEvaluation >= -2) {
          position.classification = Classification.BLUNDER;
        } else if (absoluteEvaluation >= -5) {
          position.classification = Classification.MISTAKE;
        } else {
          position.classification = Classification.INACCURACY;
        }
      }
      // 5. Mate escaped: was mate last move, now cp
      else if (previousEvaluation.type === 'mate' && evaluation.type === 'cp') {
        if (previousAbsoluteEvaluation < 0 && absoluteEvaluation < 0) {
          position.classification = Classification.BEST;
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
          if (absoluteEvaluation === previousAbsoluteEvaluation) {
            position.classification = Classification.BEST;
          } else {
            position.classification = Classification.GOOD;
          }
        }
      }
    }

    // 7. Test for Brilliant Move (Sound Tactical Material Sacrifice)
    if (position.classification === Classification.BEST) {
      const winningAnyways =
        (absoluteSecondEvaluation >= 700 && topMove.evaluation.type === 'cp') ||
        (topMove.evaluation.type === 'mate' && secondTopMove?.evaluation?.type === 'mate');

      if (absoluteEvaluation >= 0 && !winningAnyways) {
        const lastBoard = new Chess(lastPosition.fen);
        const currentBoard = new Chess(position.fen);

        if (!lastBoard.inCheck()) {
          const moveFrom = position.move.uci.slice(0, 2);
          const moveTo = position.move.uci.slice(2, 4);
          const lastPiece = lastBoard.get(moveTo) || { type: 'm' };

          const sacrificedPieces = [];
          for (const row of currentBoard.board()) {
            for (const piece of row) {
              if (!piece) continue;
              if (piece.color !== moveColour.charAt(0)) continue;
              if (piece.type === 'k' || piece.type === 'p') continue;

              if (pieceValues[lastPiece.type] >= pieceValues[piece.type]) {
                continue;
              }

              if (isPieceHanging(lastPosition.fen, position.fen, piece.square)) {
                position.classification = Classification.BRILLIANT;
                sacrificedPieces.push(piece);
              }
            }
          }

          if (sacrificedPieces.length > 0) {
            let anyPieceViablyCapturable = false;
            const captureTestBoard = new Chess(position.fen);

            for (const piece of sacrificedPieces) {
              const attackers = getAttackers(position.fen, piece.square);

              for (const attacker of attackers) {
                for (const promotion of promotions) {
                  try {
                    captureTestBoard.move({
                      from: attacker.square,
                      to: piece.square,
                      promotion,
                    });

                    let attackerPinned = false;
                    for (const row of captureTestBoard.board()) {
                      for (const enemyPiece of row) {
                        if (!enemyPiece) continue;
                        if (enemyPiece.color === captureTestBoard.turn() || enemyPiece.type === 'k') continue;

                        const maxSackVal = Math.max(...sacrificedPieces.map((sack) => pieceValues[sack.type]));
                        if (
                          isPieceHanging(position.fen, captureTestBoard.fen(), enemyPiece.square) &&
                          pieceValues[enemyPiece.type] >= maxSackVal
                        ) {
                          attackerPinned = true;
                          break;
                        }
                      }
                      if (attackerPinned) break;
                    }

                    if (!attackerPinned && !captureTestBoard.moves().some((m) => m.endsWith('#'))) {
                      anyPieceViablyCapturable = true;
                      break;
                    }

                    captureTestBoard.undo();
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

      // 8. Test for Great Move (Sole finding resource after opponent blundered)
      const moveTo = position.move.uci.slice(2, 4);
      if (
        noMate &&
        position.classification !== Classification.BRILLIANT &&
        lastPosition.classification === Classification.BLUNDER &&
        Math.abs(topMove.evaluation.value - (secondTopMove?.evaluation?.value ?? 0)) >= 150 &&
        !isPieceHanging(lastPosition.fen, position.fen, moveTo)
      ) {
        position.classification = Classification.GREAT;
      }
    }

    // 9. Do not allow blunder if move is still completely winning (>= +6.0)
    if (position.classification === Classification.BLUNDER && absoluteEvaluation >= 600) {
      position.classification = Classification.GOOD;
    }

    // 10. Do not allow blunder if you were already in a completely lost position (<= -6.0)
    if (position.classification === Classification.BLUNDER && previousAbsoluteEvaluation <= -600) {
      position.classification = Classification.GOOD;
    }

    // 11. Detect Miss (opp blundered and player played an inaccuracy/mistake instead of punishing)
    if (
      lastPosition.classification === Classification.BLUNDER &&
      (position.classification === Classification.INACCURACY || position.classification === Classification.MISTAKE)
    ) {
      position.classification = Classification.MISS;
    }

    position.classification = position.classification || Classification.BOOK;
  }

  // Detect Opening Names
  const historyUci = positions.slice(1).map((p) => p.move.uci);
  const detectedOpening = detectOpeningName(historyUci);

  for (let i = 0; i < positions.length; i++) {
    const currentPrefix = historyUci.slice(0, i);
    const openingName = detectOpeningName(currentPrefix);
    positions[i].opening = openingName;
  }

  // Apply Book moves for cloud and opening moves
  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i];
    const isBook = isBookMove(historyUci, i - 1);
    if ((pos.worker === 'cloud' && ['good', 'excellent', 'best'].includes(pos.classification)) || isBook) {
      pos.classification = Classification.BOOK;
    } else {
      break;
    }
  }

  // Generate SAN moves for engine top lines
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

  // Calculate Accuracy Percentages and ACPL (Average Centipawn Loss)
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
    const classif = position.classification || 'book';

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
    opening: detectedOpening,
    positions,
  };
}

// Generate Game Narrative Summary (e.g. "Sharp Exchange Thriller")
export function generateGameComment({ positions, stats, accuracies, acpl, whitePlayer = 'White', blackPlayer = 'Black' }) {
  const totalMoves = positions.length - 1;
  if (totalMoves <= 0) return { title: 'Opening Balance', text: 'No moves played yet.' };

  const wBlunders = stats.w.blunder;
  const bBlunders = stats.b.blunder;
  const wBrilliants = stats.w.brilliant;
  const bBrilliants = stats.b.brilliant;
  const wGreats = stats.w.great;
  const bGreats = stats.b.great;

  // Find turning points
  const keyEvents = [];
  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i];
    const isWhite = pos.fen.includes(' b ');
    const player = isWhite ? whitePlayer : blackPlayer;
    const moveNum = Math.ceil(i / 2);

    if (pos.classification === Classification.BRILLIANT) {
      keyEvents.push(`On move ${moveNum}, ${player} uncorked a brilliant tactical sacrifice with ${pos.move.san || pos.move.uci}.`);
    } else if (pos.classification === Classification.GREAT) {
      keyEvents.push(`On move ${moveNum}, ${player} found the crucial continuation ${pos.move.san || pos.move.uci}.`);
    } else if (pos.classification === Classification.BLUNDER && keyEvents.length < 3) {
      keyEvents.push(`The tide shifted on move ${moveNum} when ${player}'s ${pos.move.san || pos.move.uci} conceded a critical tactical opening.`);
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
    text = keyEvents.slice(0, 3).join(' ') + ` Both sides fought tenaciously over ${totalMoves} moves with White achieving ${accuracies.white}% accuracy (ACPL ${acpl.white}) and Black ${accuracies.black}% accuracy (ACPL ${acpl.black}).`;
  } else {
    text = `A solid opening transition into a well-coordinated middlegame. White maintained steady pressure with ${accuracies.white}% accuracy, while Black countered with ${accuracies.black}% accuracy.`;
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

// Full Game Review Runner (Stockfish WASM + Lichess Cloud Eval Hybrid)
export async function analyzeFullGame(moves, onProgress, options = {}) {
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
      worker: 'local',
      depth: 0,
      classification: null,
      opening: null,
    });
  }

  // Step 2: Hybrid Evaluation Loop (Cloud Eval first, Local Worker fallback)
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
      const blackWon = isCheckmate && testBoard.turn() === 'w';

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

    // Try Lichess Cloud Evaluation for speed
    let evalResult = await fetchCloudEval(pos.fen);

    // Fall back to local Stockfish WASM worker
    if (!evalResult) {
      const depth = options.depth || 12;
      const stockfishEval = await stockfishService.evaluatePosition({
        fen: pos.fen,
        depth,
        multiPv: 2,
      });

      if (stockfishEval) {
        evalResult = {
          worker: 'local',
          depth: stockfishEval.depth || depth,
          bestMove: stockfishEval.bestMove,
          whiteCp: stockfishEval.whiteCp || 0,
          whiteMate: stockfishEval.whiteMate,
          topLines: (stockfishEval.topMoves || []).map((tm, idx) => ({
            id: tm.multipv || idx + 1,
            depth: tm.depth || depth,
            evaluation: {
              type: tm.whiteMate !== null && tm.whiteMate !== undefined ? 'mate' : 'cp',
              value: tm.whiteMate !== null && tm.whiteMate !== undefined ? tm.whiteMate : tm.whiteCp,
            },
            moveUCI: tm.uci || '',
            pv: tm.pv || '',
          })),
        };
      }
    }

    if (evalResult) {
      pos.worker = evalResult.worker;
      pos.depth = evalResult.depth;
      pos.topLines = evalResult.topLines || [];
      pos.bestMove = evalResult.bestMove;
    } else {
      // Safe fallback if worker returns null
      pos.topLines = [
        {
          id: 1,
          depth: 1,
          evaluation: { type: 'cp', value: 0 },
          moveUCI: '',
        },
      ];
    }
  }

  // Step 3: Run Full Tactical Classification
  const analysisReport = analysePositions(positions);

  // Step 4: Build enriched classifiedMoves array for UI consumption
  const classifiedMoves = [];
  for (let i = 0; i < normalizedMoves.length; i++) {
    const move = normalizedMoves[i];
    const prevPos = positions[i];
    const currPos = positions[i + 1];
    const classif = currPos.classification || Classification.BOOK;
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

    classifiedMoves.push({
      index: i,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san || `${move.from}-${move.to}`,
      from: move.from,
      to: move.to,
      fen: currPos.fen,
      classification: classifInfo,
      evalLoss: currPos.evalLoss || 0,
      scoreDisplay,
      bestMove: prevPos.topLines[0]?.moveUCI || null,
      bestMoveSan: prevPos.topLines[0]?.moveSAN || null,
      coachExplanation,
      pv: currPos.topLines[0]?.pv || '',
    });
  }

  const gameComment = generateGameComment({
    positions,
    stats: analysisReport.stats,
    accuracies: analysisReport.accuracies,
    acpl: analysisReport.acpl,
    whitePlayer: options.whitePlayer || 'White',
    blackPlayer: options.blackPlayer || 'Black',
  });

  const evaluations = positions.map((p) => {
    const top = p.topLines?.[0];
    const cpVal = top?.evaluation?.type === 'cp' ? top.evaluation.value : (top?.evaluation?.value > 0 ? 10000 : -10000);
    const mateVal = top?.evaluation?.type === 'mate' ? top.evaluation.value : null;
    return {
      fen: p.fen,
      whiteCp: cpVal,
      whiteMate: mateVal,
      cp: cpVal,
      mate: mateVal,
      bestMove: p.bestMove || top?.moveUCI || null,
      pv: top?.pv || '',
      depth: p.depth || 12,
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
