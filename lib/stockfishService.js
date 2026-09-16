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

  // Evaluate a position using dedicated evalWorker
  async evaluatePosition({ fen, depth = 12 }) {
    await this.init();

    if (this.useFallback || !this.evalWorker) {
      return this.calculateFallbackEval(fen);
    }

    return new Promise((resolve) => {
      const fenTurn = (fen || '').split(' ')[1] || 'w';
      const isWhiteTurn = fenTurn === 'w';

      let resolved = false;
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
      };

      const finalizeEval = () => {
        const whiteCp = isWhiteTurn ? lastInfo.rawCp : -lastInfo.rawCp;
        const whiteMate = lastInfo.rawMate !== null ? (isWhiteTurn ? lastInfo.rawMate : -lastInfo.rawMate) : null;
        return {
          ...lastInfo,
          cp: whiteCp,
          mate: whiteMate,
          whiteCp,
          whiteMate,
        };
      };

      const timeoutMs = Math.max(6500, (depth || 14) * 500);
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.evalTask = null;
          resolve(finalizeEval());
        }
      }, timeoutMs);

      this.evalTask = {
        onLine: (line) => {
          if (line.startsWith('info') && line.includes('score')) {
            const depthMatch = line.match(/depth (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/pv (.+)/);

            if (depthMatch) lastInfo.depth = parseInt(depthMatch[1], 10);
            if (cpMatch) {
              lastInfo.rawCp = parseInt(cpMatch[1], 10);
              lastInfo.rawMate = null;
            }
            if (mateMatch) {
              lastInfo.rawMate = parseInt(mateMatch[1], 10);
            }
            if (pvMatch) {
              lastInfo.pv = pvMatch[1];
              const firstMove = pvMatch[1].split(' ')[0];
              if (firstMove) lastInfo.bestMove = firstMove;
            }
          } else if (line.startsWith('bestmove')) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              this.evalTask = null;
              const parts = line.split(' ');
              if (parts[1] && parts[1] !== '(none)') {
                lastInfo.bestMove = parts[1];
              }
              resolve(finalizeEval());
            }
          }
        },
      };

      try {
        this.evalWorker.postMessage('stop');
        this.evalWorker.postMessage('setoption name Skill Level value 20');
        this.evalWorker.postMessage('setoption name UCI_LimitStrength value false');
        this.evalWorker.postMessage(`position fen ${fen}`);
        this.evalWorker.postMessage(`go depth ${depth}`);
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
      };
    }
  }
}

export const stockfishService = new StockfishService();
