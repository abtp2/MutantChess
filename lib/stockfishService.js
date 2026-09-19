// Robust, Dual-Worker Stockfish 18 Lite WASM Service with Guaranteed Legal Fallback
import { Chess } from 'chess.js';

class StockfishService {
  constructor() {
    this.moveWorker = null;
    this.evalWorker = null;
    this.isMoveReady = false;
    this.isEvalReady = false;
    this.useFallback = false;

    this.moveTask = null;
    this.evalTask = null;

    this.initPromise = null;
  }

  createWorker() {
    try {
      const wasmPath = encodeURIComponent('/stockfish/stockfish-18-lite-single.wasm');
      return new Worker(`/stockfish/stockfish-18-lite-single.js#${wasmPath}`);
    } catch (e) {
      return null;
    }
  }

  // Create a dedicated worker strictly for full game review analysis
  createAnalysisWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
    try {
      const wasmPath = encodeURIComponent('/stockfish/stockfish-18-lite-single.wasm');
      return new Worker(`/stockfish/stockfish-18-lite-single.js#${wasmPath}`);
    } catch (e) {
      return null;
    }
  }

  init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof window === 'undefined') {
        this.useFallback = true;
        resolve();
        return;
      }

      try {
        this.moveWorker = this.createWorker();
        this.evalWorker = this.createWorker();

        if (!this.moveWorker || !this.evalWorker) {
          this.useFallback = true;
          resolve();
          return;
        }

        let moveReady = false;
        let evalReady = false;

        const checkBothReady = () => {
          if (moveReady && evalReady) {
            this.isMoveReady = true;
            this.isEvalReady = true;
            resolve();
          }
        };

        const timeout = setTimeout(() => {
          this.isMoveReady = true;
          this.isEvalReady = true;
          resolve();
        }, 3500);

        // Move Worker Message Handler
        this.moveWorker.onmessage = (e) => {
          const raw = e.data;
          const line = typeof raw === 'string' ? raw : (raw && raw.line ? raw.line : '');

          if (!moveReady && (line.includes('Stockfish') || line.includes('uciok') || line.includes('readyok'))) {
            moveReady = true;
            checkBothReady();
          }

          if (this.moveTask && this.moveTask.onLine) {
            this.moveTask.onLine(line);
          }
        };

        this.moveWorker.onerror = () => {
          this.useFallback = true;
          resolve();
        };

        // Eval Worker Message Handler
        this.evalWorker.onmessage = (e) => {
          const raw = e.data;
          const line = typeof raw === 'string' ? raw : (raw && raw.line ? raw.line : '');

          if (!evalReady && (line.includes('Stockfish') || line.includes('uciok') || line.includes('readyok'))) {
            evalReady = true;
            checkBothReady();
          }

          if (this.evalTask && this.evalTask.onLine) {
            this.evalTask.onLine(line);
          }
        };

        this.evalWorker.onerror = () => {
          this.isEvalReady = true;
          checkBothReady();
        };

        this.moveWorker.postMessage('uci');
        this.moveWorker.postMessage('isready');

        this.evalWorker.postMessage('uci');
        this.evalWorker.postMessage('isready');
      } catch (err) {
        this.useFallback = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  // Helper to verify move legality against a FEN
  isLegalMove(fen, move) {
    if (!move || !move.from || !move.to) return false;
    try {
      const c = new Chess(fen);
      const res = c.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
      return !!res;
    } catch (e) {
      return false;
    }
  }

  // Get Best Move for AI using dedicated moveWorker
  async getBestMove({ fen, elo = 1000, skillLevel = 4, depth = 6, moveTime = 600 }) {
    await this.init();

    if (this.useFallback || !this.moveWorker) {
      return this.calculateFallbackMove(fen, elo);
    }

    return new Promise((resolve) => {
      let resolved = false;
      let searchStarted = false;

      // Safety timeout: always resolve with fallback before freezing
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.moveTask = null;
          resolve(this.calculateFallbackMove(fen, elo));
        }
      }, (moveTime || 600) + 2000);

      this.moveTask = {
        onLine: (line) => {
          if (!searchStarted) return; // Ignore any bestmove emitted by prior search stopping

          if (line.startsWith('bestmove')) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              this.moveTask = null;

              const parts = line.split(' ');
              const moveStr = parts[1];

              if (moveStr && moveStr !== '(none)') {
                const candidate = {
                  from: moveStr.substring(0, 2),
                  to: moveStr.substring(2, 4),
                  promotion: moveStr.length > 4 ? moveStr[4] : undefined,
                  uci: moveStr,
                };

                // Validate move legality against the current FEN
                if (this.isLegalMove(fen, candidate)) {
                  resolve(candidate);
                  return;
                }
              }

              // Fallback if candidate move is invalid
              resolve(this.calculateFallbackMove(fen, elo));
            }
          }
        },
      };

      try {
        this.moveWorker.postMessage('stop');
        this.moveWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        if (elo >= 1320) {
          this.moveWorker.postMessage('setoption name UCI_LimitStrength value true');
          this.moveWorker.postMessage(`setoption name UCI_Elo value ${Math.min(3190, elo)}`);
        } else {
          this.moveWorker.postMessage('setoption name UCI_LimitStrength value false');
        }
        this.moveWorker.postMessage(`position fen ${fen}`);
        if (moveTime) {
          this.moveWorker.postMessage(`go movetime ${moveTime}`);
        } else {
          this.moveWorker.postMessage(`go depth ${depth || 6}`);
        }
        searchStarted = true;
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.moveTask = null;
          resolve(this.calculateFallbackMove(fen, elo));
        }
      }
    });
  }

  // Stop any ongoing evaluation task
  stopEvaluation() {
    if (this.evalWorker) {
      try {
        this.evalWorker.postMessage('stop');
      } catch (e) {}
    }
    if (this.evalTask && this.evalTask.cancel) {
      this.evalTask.cancel();
    }
    this.evalTask = null;
  }

  // Evaluate a position using dedicated evalWorker
  async evaluatePosition({ fen, depth = 12, multiPv = 2 }) {
    await this.init();

    if (this.useFallback || !this.evalWorker) {
      return this.calculateFallbackEval(fen);
    }

    this.evalTaskId = (this.evalTaskId || 0) + 1;
    const currentTaskId = this.evalTaskId;

    // Clean up previous evaluation task if still in flight
    if (this.evalTask && this.evalTask.cancel) {
      this.evalTask.cancel();
    }
    if (this.evalWorker) {
      try {
        this.evalWorker.postMessage('stop');
      } catch (e) {}
    }

    return new Promise((resolve) => {
      const fenTurn = (fen || '').split(' ')[1] || 'w';
      const isWhiteTurn = fenTurn === 'w';

      let resolved = false;
      const topMovesMap = {};
      let lastInfo = {
        rawCp: 0,
        rawMate: null,
        cp: 0,
        mate: null,
        whiteCp: 0,
        whiteMate: null,
        turn: fenTurn,
        bestMove: null,
        pv: '',
        depth: 0,
        topMoves: [],
      };

      const finalizeEval = () => {
        const whiteCp = isWhiteTurn ? lastInfo.rawCp : -lastInfo.rawCp;
        const whiteMate = lastInfo.rawMate !== null ? (isWhiteTurn ? lastInfo.rawMate : -lastInfo.rawMate) : null;

        const validTopMoves = Object.values(topMovesMap)
          .filter((tm) => tm.uci && tm.uci.length >= 4 && this.isLegalMove(fen, {
            from: tm.uci.substring(0, 2),
            to: tm.uci.substring(2, 4),
            promotion: tm.uci.length > 4 ? tm.uci[4] : undefined,
          }))
          .sort((a, b) => a.multipv - b.multipv)
          .map((tm) => {
            const tmWhiteCp = isWhiteTurn ? tm.rawCp : -tm.rawCp;
            const tmWhiteMate = tm.rawMate !== null ? (isWhiteTurn ? tm.rawMate : -tm.rawMate) : null;
            return {
              ...tm,
              cp: tmWhiteCp,
              mate: tmWhiteMate,
              whiteCp: tmWhiteCp,
              whiteMate: tmWhiteMate,
            };
          });

        let verifiedBest = lastInfo.bestMove;
        if (!verifiedBest || !this.isLegalMove(fen, {
          from: verifiedBest.substring(0, 2),
          to: verifiedBest.substring(2, 4),
          promotion: verifiedBest.length > 4 ? verifiedBest[4] : undefined,
        })) {
          verifiedBest = validTopMoves[0]?.uci || null;
        }

        if (!verifiedBest) {
          const fallback = this.calculateFallbackMove(fen);
          if (fallback) {
            verifiedBest = fallback.uci;
          }
        }

        return {
          ...lastInfo,
          bestMove: verifiedBest,
          cp: whiteCp,
          mate: whiteMate,
          whiteCp,
          topMoves: validTopMoves.length > 0 ? validTopMoves : (verifiedBest ? [{ multipv: 1, uci: verifiedBest, cp: whiteCp, mate: whiteMate, pv: lastInfo.pv || verifiedBest, depth: lastInfo.depth }] : []),
        };
      };

      const timeoutMs = Math.max(2200, (depth || 12) * 200);
      const timer = setTimeout(() => {
        if (!resolved && this.evalTaskId === currentTaskId) {
          resolved = true;
          this.evalTask = null;
          resolve(finalizeEval());
        }
      }, timeoutMs);

      let searchStarted = false;

      this.evalTask = {
        taskId: currentTaskId,
        cancel: () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            if (this.evalWorker) {
              try {
                this.evalWorker.postMessage('stop');
              } catch (e) {}
            }
            resolve(finalizeEval());
          }
        },
        onLine: (line) => {
          if (this.evalTaskId !== currentTaskId) return;
          if (!searchStarted) return; // Discard residual output emitted while stopping previous search

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

            if (cpMatch) {
              rawCp = parseInt(cpMatch[1], 10);
            }
            if (mateMatch) {
              rawMate = parseInt(mateMatch[1], 10);
            }

            let firstMove = null;
            let pvString = '';
            if (pvMatch) {
              pvString = pvMatch[1];
              firstMove = pvMatch[1].split(' ')[0];
            }

            // Verify move legality strictly against current FEN
            const isMoveLegal = firstMove && firstMove.length >= 4 && this.isLegalMove(fen, {
              from: firstMove.substring(0, 2),
              to: firstMove.substring(2, 4),
              promotion: firstMove.length > 4 ? firstMove[4] : undefined,
            });

            if (isMoveLegal) {
              if (mpvIndex === 1) {
                if (depthMatch) lastInfo.depth = currentDepth;
                lastInfo.rawCp = rawCp;
                lastInfo.rawMate = rawMate;
                if (pvString) lastInfo.pv = pvString;
                lastInfo.bestMove = firstMove;
              }

              topMovesMap[mpvIndex] = {
                multipv: mpvIndex,
                uci: firstMove,
                rawCp,
                rawMate,
                pv: pvString,
                depth: currentDepth,
              };
            }
          } else if (line.startsWith('bestmove')) {
            if (!resolved) {
              const parts = line.split(' ');
              const moveStr = parts[1];

              // If this is a residual '(none)' from a previous stop and we haven't read info yet, ignore it
              if (moveStr === '(none)' && Object.keys(topMovesMap).length === 0) {
                return;
              }

              if (moveStr && moveStr !== '(none)' && moveStr.length >= 4) {
                const candidate = {
                  from: moveStr.substring(0, 2),
                  to: moveStr.substring(2, 4),
                  promotion: moveStr.length > 4 ? moveStr[4] : undefined,
                };
                if (this.isLegalMove(fen, candidate)) {
                  lastInfo.bestMove = moveStr;
                }
              }
              resolved = true;
              clearTimeout(timer);
              this.evalTask = null;
              resolve(finalizeEval());
            }
          }
        },
      };

      try {
        this.evalWorker.postMessage('setoption name Skill Level value 20');
        this.evalWorker.postMessage('setoption name UCI_LimitStrength value false');
        this.evalWorker.postMessage(`setoption name MultiPV value ${multiPv || 2}`);
        this.evalWorker.postMessage(`position fen ${fen}`);
        searchStarted = true;
        this.evalWorker.postMessage(`go depth ${depth || 12}`);
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.evalTask = null;
          resolve(this.calculateFallbackEval(fen));
        }
      }
    });
  }

  // Fallback move calculator
  calculateFallbackMove(fen, elo = 1000) {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return null;

      const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

      const scoredMoves = moves.map((m) => {
        let score = 0;
        if (m.captured) {
          score += (pieceValues[m.captured] || 0) * 10 - (pieceValues[m.piece] || 0);
        }
        if (m.promotion) score += 800;

        const testChess = new Chess(fen);
        testChess.move(m);
        if (testChess.inCheck()) score += 50;
        if (testChess.isCheckmate()) score += 10000;

        if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) score += 30;

        const randomFactor = Math.max(10, 3000 - elo) / 50;
        score += (Math.random() - 0.5) * randomFactor * 20;

        return { move: m, score };
      });

      scoredMoves.sort((a, b) => b.score - a.score);
      const best = scoredMoves[0]?.move || moves[0];

      return {
        from: best.from,
        to: best.to,
        promotion: best.promotion,
        uci: best.from + best.to + (best.promotion || ''),
      };
    } catch (e) {
      return null;
    }
  }

  calculateFallbackEval(fen) {
    try {
      const chess = new Chess(fen);
      const fenTurn = chess.turn();
      if (chess.isCheckmate()) {
        const winner = fenTurn === 'w' ? -1 : 1;
        return {
          rawCp: 0,
          rawMate: winner,
          cp: 0,
          mate: winner,
          whiteCp: 0,
          whiteMate: winner,
          turn: fenTurn,
          bestMove: null,
          pv: '',
          depth: 1,
        };
      }
      if (chess.isDraw()) {
        return {
          rawCp: 0,
          rawMate: null,
          cp: 0,
          mate: null,
          whiteCp: 0,
          whiteMate: null,
          turn: fenTurn,
          bestMove: null,
          pv: '',
          depth: 1,
        };
      }

      const board = chess.board();
      const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
      let cp = 0;

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece) {
            const val = pieceValues[piece.type] || 0;
            cp += piece.color === 'w' ? val : -val;
          }
        }
      }

      const best = this.calculateFallbackMove(fen, 1500);
      const topMoves = best
        ? [
            {
              multipv: 1,
              uci: best.uci,
              rawCp: fenTurn === 'w' ? cp : -cp,
              rawMate: null,
              cp,
              mate: null,
              whiteCp: cp,
              whiteMate: null,
              pv: best.uci,
              depth: 4,
            },
          ]
        : [];

      return {
        rawCp: fenTurn === 'w' ? cp : -cp,
        rawMate: null,
        cp,
        mate: null,
        whiteCp: cp,
        whiteMate: null,
        turn: fenTurn,
        bestMove: best ? best.uci : null,
        pv: best ? best.uci : '',
        depth: 4,
        topMoves,
      };
    } catch (e) {
      return {
        rawCp: 0,
        rawMate: null,
        cp: 0,
        mate: null,
        whiteCp: 0,
        whiteMate: null,
        turn: 'w',
        bestMove: null,
        pv: '',
        depth: 0,
        topMoves: [],
      };
    }
  }
}

export const stockfishService = new StockfishService();
