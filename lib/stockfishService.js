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
    this.evalCache = new Map();
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
  async evaluatePosition({ fen, depth = 8, multiPv = 2, onUpdate = null }) {
    await this.init();

    // Fast-path: Checkmate / Stalemate detection via chess.js
    try {
      const c = new Chess(fen);
      if (c.isGameOver()) {
        const isWhiteTurn = c.turn() === 'w';
        let cp = 0;
        let mate = null;
        if (c.isCheckmate()) {
          mate = isWhiteTurn ? -1 : 1;
          cp = isWhiteTurn ? -10000 : 10000;
        }
        const immediateResult = {
          cp,
          mate,
          whiteCp: cp,
          whiteMate: mate,
          turn: c.turn(),
          bestMove: null,
          pv: '',
          depth: 0,
          topMoves: [],
        };
        if (this.evalCache) {
          if (this.evalCache.size > 500) {
            const firstKey = this.evalCache.keys().next().value;
            this.evalCache.delete(firstKey);
          }
          this.evalCache.set(fen, immediateResult);
        }
        if (onUpdate && typeof onUpdate === 'function') {
          try { onUpdate(immediateResult); } catch (e) {}
        }
        return Promise.resolve(immediateResult);
      }
    } catch (e) {}

    if (this.useFallback || !this.evalWorker) {
      const fallback = this.calculateFallbackEval(fen);
      if (onUpdate && typeof onUpdate === 'function') {
        try { onUpdate(fallback); } catch (e) {}
      }
      return fallback;
    }

    if (this.evalCache && this.evalCache.has(fen)) {
      const cached = this.evalCache.get(fen);
      if (onUpdate && typeof onUpdate === 'function') {
        try { onUpdate(cached); } catch (e) {}
      }
      return Promise.resolve(cached);
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
      let hasReceivedScore = false;
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
          .filter((tm) => tm.uci && tm.uci.length >= 4)
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

        let verifiedBest = lastInfo.bestMove || validTopMoves[0]?.uci || null;
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

      const timeoutMs = Math.max(1200, (depth || 8) * 150);
      const timer = setTimeout(() => {
        if (!resolved && this.evalTaskId === currentTaskId) {
          resolved = true;
          this.evalTask = null;
          const finalResult = finalizeEval();
          if (this.evalCache) {
            if (this.evalCache.size > 500) {
              const firstKey = this.evalCache.keys().next().value;
              this.evalCache.delete(firstKey);
            }
            this.evalCache.set(fen, finalResult);
          }
          resolve(finalResult);
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
            resolve(null);
          }
        },
        onLine: (line) => {
          if (this.evalTaskId !== currentTaskId || resolved) return;
          if (!searchStarted) return; // Discard residual output emitted while stopping previous search

          if (line.startsWith('info') && line.includes('score')) {
            const depthMatch = line.match(/depth (\d+)/);
            const mpvMatch = line.match(/multipv (\d+)/);
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/(?:^|\s)pv\s+(.+)/);

            const mpvIndex = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;
            const currentDepth = depthMatch ? parseInt(depthMatch[1], 10) : 0;

            // Discard residual output from prior search if depth > 1 before depth 1 has been seen
            if (!hasReceivedScore && currentDepth > 1) {
              return;
            }
            hasReceivedScore = true;
            let rawCp = lastInfo.rawCp;
            let rawMate = lastInfo.rawMate;

            if (cpMatch) {
              rawCp = parseInt(cpMatch[1], 10);
              rawMate = null;
            } else if (mateMatch) {
              rawMate = parseInt(mateMatch[1], 10);
              rawCp = rawMate > 0 ? 10000 : -10000;
            }

            let firstMove = null;
            let pvString = '';
            if (pvMatch) {
              pvString = pvMatch[1].trim();
              firstMove = pvString.split(/\s+/)[0];
            }

            if (mpvIndex === 1) {
              if (depthMatch) lastInfo.depth = currentDepth;
              lastInfo.rawCp = rawCp;
              lastInfo.rawMate = rawMate;
              if (pvString) lastInfo.pv = pvString;
              if (firstMove && firstMove.length >= 4) lastInfo.bestMove = firstMove;

              // Stream intermediate evaluation immediately to UI!
              if (onUpdate && typeof onUpdate === 'function') {
                try {
                  onUpdate(finalizeEval());
                } catch (e) {}
              }
            }

            if (firstMove && firstMove.length >= 4) {
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
              // If we have not received any score line for this search yet,
              // this bestmove is a residual event emitted while stopping a prior search.
              if (!hasReceivedScore && Object.keys(topMovesMap).length === 0) {
                return;
              }

              const parts = line.split(' ');
              const moveStr = parts[1];

              if (moveStr && moveStr !== '(none)' && moveStr.length >= 4) {
                lastInfo.bestMove = moveStr;
              }
              resolved = true;
              clearTimeout(timer);
              this.evalTask = null;
              const finalResult = finalizeEval();
              if (this.evalCache) this.evalCache.set(fen, finalResult);
              resolve(finalResult);
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
        this.evalWorker.postMessage(`go depth ${depth || 8}`);
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.evalTask = null;
          const fallback = this.calculateFallbackEval(fen);
          if (onUpdate && typeof onUpdate === 'function') {
            try { onUpdate(fallback); } catch (err) {}
          }
          resolve(fallback);
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
      
      // Standard simplified piece-square tables for tactical and positional nuance
      const pawnTable = [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
      ];
      const knightTable = [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
      ];
      const bishopTable = [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
      ];

      let cp = 0;

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece) {
            let val = pieceValues[piece.type] || 0;
            let posVal = 0;
            const tableRow = piece.color === 'w' ? r : (7 - r);
            if (piece.type === 'p') posVal = pawnTable[tableRow][f];
            else if (piece.type === 'n') posVal = knightTable[tableRow][f];
            else if (piece.type === 'b') posVal = bishopTable[tableRow][f];
            else if (piece.type === 'q') posVal = Math.round(bishopTable[tableRow][f] * 0.5);

            const total = val + posVal;
            cp += piece.color === 'w' ? total : -total;
          }
        }
      }

      // Small bonus for the side whose turn it is (tempo)
      cp += fenTurn === 'w' ? 15 : -15;

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
