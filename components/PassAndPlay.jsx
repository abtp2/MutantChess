// Professional Chess.com style 1 vs 1 Pass and Play with White-triggered clock
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playCastleSound,
  playGameEndSound,
} from '../lib/audio';
import { RotateCcw, Flag, Handshake, BarChart2, RefreshCw, Trophy, ShieldAlert, Copy, Check, Minus, Plus } from 'lucide-react';

export default function PassAndPlay({
  boardThemeId = 'glass',
  onAnalyzeGame,
}) {
  const [chess, setChess] = useState(() => new Chess());

  const [historyMoves, setHistoryMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [lastMove, setLastMove] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [gameOverReason, setGameOverReason] = useState('');
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [boardHeight, setBoardHeight] = useState(560);
  const [userBoardWidth, setUserBoardWidth] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mutantchess_board_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 1000) {
          setUserBoardWidth(parsed);
        }
      }
    } catch (e) {}
  }, []);

  const handleAdjustBoardWidth = (delta) => {
    const current = userBoardWidth || boardHeight || 560;
    const next = Math.max(340, Math.min(840, current + delta));
    setUserBoardWidth(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mutantchess_board_width', next.toString());
      } catch (e) {}
    }
  };

  const handleResetBoardWidth = () => {
    setUserBoardWidth(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mutantchess_board_width');
      } catch (e) {}
    }
  };

  const handleCopyFen = async () => {
    try {
      const fen = chessRef.current ? chessRef.current.fen() : chess.fen();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fen);
      } else {
        const el = document.createElement('textarea');
        el.value = fen;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 2000);
    } catch (e) {
      console.error('Failed to copy FEN', e);
    }
  };

  const handleCopyPgn = async () => {
    try {
      const c = new Chess();
      c.header('Event', 'MutantChess Pass & Play', 'Site', 'MutantChess', 'Date', new Date().toISOString().split('T')[0].replace(/-/g, '.'));
      for (const m of historyMoves) {
        c.move(m);
      }
      const pgn = c.pgn();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pgn);
      } else {
        const el = document.createElement('textarea');
        el.value = pgn;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedPgn(true);
      setTimeout(() => setCopiedPgn(false), 2000);
    } catch (e) {
      console.error('Failed to copy PGN', e);
    }
  };

  // Clocks - Start timer ONLY after White's first move is played!
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isTimerStarted, setIsTimerStarted] = useState(false);

  const chessRef = useRef(chess);
  chessRef.current = chess;

  const playMoveAudio = (res) => {
    if (chessRef.current.isGameOver()) {
      playGameEndSound(true);
    } else if (chessRef.current.inCheck()) {
      playCheckSound();
    } else if (res.flags.includes('c') || res.flags.includes('e')) {
      playCaptureSound();
    } else if (res.flags.includes('k') || res.flags.includes('q')) {
      playCastleSound();
    } else {
      playMoveSound();
    }
  };

  const gameResultRef = useRef(gameResult);
  gameResultRef.current = gameResult;

  useEffect(() => {
    if (gameResult || !isTimerStarted) return;
    const timer = setInterval(() => {
      if (gameResultRef.current || !chessRef.current) return;
      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTime((t) => {
          if (t <= 1) {
            handleGameOver('Black wins on time!', 'White ran out of time.');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTime((t) => {
          if (t <= 1) {
            handleGameOver('White wins on time!', 'Black ran out of time.');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerStarted, gameResult]);

  const handleGameOver = (title, reason) => {
    setGameResult(title);
    setGameOverReason(reason);
    playGameEndSound(true);
  };

  const handleMove = ({ from, to, promotion = 'q' }) => {
    if (gameResult) return false;

    // If reviewing earlier moves, snap to latest move before allowing next play
    if (historyMoves.length > 0 && currentMoveIndex !== historyMoves.length - 1) {
      handleSelectMove(historyMoves.length - 1);
      return false;
    }

    try {
      const next = new Chess(chess.fen());
      const res = next.move({ from, to, promotion });
      if (!res) return false;

      // Start clock when White makes first move!
      if (!isTimerStarted) {
        setIsTimerStarted(true);
      }

      if (res.captured) {
        const capturedObj = { type: res.captured, color: res.color === 'w' ? 'b' : 'w' };
        if (res.color === 'w') {
          setCapturedWhite((prev) => [...prev, capturedObj]);
        } else {
          setCapturedBlack((prev) => [...prev, capturedObj]);
        }
      }

      setChess(next);
      setLastMove({ from, to });
      const newMoves = next.history({ verbose: true });
      setHistoryMoves(newMoves);
      setCurrentMoveIndex(newMoves.length - 1);
      playMoveAudio(res);
      if (autoFlip) {
        setIsFlipped(next.turn() === 'b');
      }

      if (next.isGameOver()) {
        if (next.isCheckmate()) {
          const winner = res.color === 'w' ? 'White' : 'Black';
          handleGameOver(`${winner} Wins!`, 'Checkmate!');
        } else if (next.isDraw()) {
          handleGameOver('Draw!', 'Draw by stalemate or repetition.');
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const startNewGame = () => {
    setChess(new Chess());
    setHistoryMoves([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setGameResult(null);
    setGameOverReason('');
    setCopiedFen(false);
    setCopiedPgn(false);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWhiteTime(600);
    setBlackTime(600);
    setIsTimerStarted(false);
    setIsFlipped(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectMove = (index) => {
    if (index < -1 || index >= historyMoves.length) return;
    setCurrentMoveIndex(index);
    if (index === -1) {
      setChess(new Chess());
      setLastMove(null);
    } else {
      const targetMove = historyMoves[index];
      if (targetMove && targetMove.after) {
        setChess(new Chess(targetMove.after));
        setLastMove({ from: targetMove.from, to: targetMove.to });
      } else {
        const c = new Chess();
        for (let i = 0; i <= index; i++) {
          try {
            c.move(historyMoves[i]);
          } catch (e) {
            break;
          }
        }
        setChess(c);
        if (historyMoves[index]) {
          setLastMove({ from: historyMoves[index].from, to: historyMoves[index].to });
        }
      }
    }
  };

  const isWhiteTurn = chess.turn() === 'w';

  return (
    <div className="w-full max-w-[1680px] mx-auto px-1 sm:px-3 py-1 sm:py-3 select-none animate-fadeIn">
      
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6 w-full">
        
        {/* Left Column: Board Area */}
        <div className="flex-1 flex flex-col items-center min-w-0 w-full">
          
          {/* Top Player Card */}
          <div 
            className="w-full mb-1.5 sm:mb-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight}px` : '100%' }}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-theme-btn flex items-center justify-center font-bold text-xs text-white border border-theme-border shrink-0">
                {isFlipped ? 'W' : 'B'}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm text-theme-text truncate block">
                  {isFlipped ? 'Player 1 (White)' : 'Player 2 (Black)'}
                </span>
                <div className="scale-90 sm:scale-100 origin-left">
                  <CapturedPieces
                    whiteCaptured={capturedWhite}
                    blackCaptured={capturedBlack}
                    playerColor={isFlipped ? 'w' : 'b'}
                  />
                </div>
              </div>
            </div>

            <div
              className={`font-mono text-xs sm:text-base font-bold px-2.5 sm:px-3 py-1 rounded-xs transition-colors shrink-0 ${
                isTimerStarted && ((!isFlipped && !isWhiteTurn) || (isFlipped && isWhiteTurn))
                  ? 'bg-theme-accent text-white shadow-xs'
                  : 'bg-theme-sub text-theme-sec border border-theme-border'
              }`}
            >
              {formatTime(isFlipped ? whiteTime : blackTime)}
            </div>
          </div>

          {/* ChessBoard */}
          <div className="w-full flex justify-center">
            <ChessBoard
              chess={chess}
              onMove={handleMove}
              playerColor={null} // Pass & play allows both sides
              isFlipped={isFlipped}
              themeId={boardThemeId}
              lastMove={lastMove}
              disabled={gameResult !== null}
              onBoardWidthChange={setBoardHeight}
              customBoardWidth={userBoardWidth}
            />
          </div>

          {/* Bottom Player Card */}
          <div 
            className="w-full mt-1.5 sm:mt-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight}px` : '100%' }}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-[#ffffff] flex items-center justify-center font-bold text-xs text-gray-900 shadow-xs shrink-0">
                {isFlipped ? 'B' : 'W'}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm text-theme-text truncate block">
                  {isFlipped ? 'Player 2 (Black)' : 'Player 1 (White)'}
                </span>
                <div className="scale-90 sm:scale-100 origin-left">
                  <CapturedPieces
                    whiteCaptured={capturedWhite}
                    blackCaptured={capturedBlack}
                    playerColor={isFlipped ? 'b' : 'w'}
                  />
                </div>
              </div>
            </div>

            <div
              className={`font-mono text-xs sm:text-base font-bold px-2.5 sm:px-3 py-1 rounded-xs transition-colors shrink-0 ${
                isTimerStarted && ((isFlipped && !isWhiteTurn) || (!isFlipped && isWhiteTurn))
                  ? 'bg-theme-accent text-white shadow-xs'
                  : 'bg-theme-sub text-theme-sec border border-theme-border'
              }`}
            >
              {formatTime(isFlipped ? blackTime : whiteTime)}
            </div>
          </div>

          {/* Board Controls Bar: Move indicator, Flip Board, and Board Size Controls */}
          <div 
            className="w-full mt-1.5 sm:mt-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between text-xs font-mono shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight}px` : '100%' }}
          >
            {/* Left: Flip Board & Copy Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                title="Flip board view"
                className="px-2 sm:px-2.5 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border hover:border-theme-borderLight transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 text-xs font-sans font-semibold active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-theme-sec" />
                <span>Flip</span>
              </button>

              <div className="flex items-center gap-1 border-l border-theme-border pl-1.5 sm:pl-2">
                <button
                  onClick={handleCopyFen}
                  title="Copy current position FEN"
                  className="px-2 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-muted hover:text-white border border-theme-border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-sans active:scale-95"
                >
                  {copiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFen ? 'Copied' : 'FEN'}</span>
                </button>
                <button
                  onClick={handleCopyPgn}
                  title="Copy game PGN"
                  className="px-2 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-muted hover:text-white border border-theme-border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-sans active:scale-95"
                >
                  {copiedPgn ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPgn ? 'Copied' : 'PGN'}</span>
                </button>
              </div>
            </div>

            {/* Right: Board Size Controls (- Auto / 400px +) - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 bg-theme-sub px-2 py-0.5 rounded-xs border border-theme-border">
              <span className="text-[11px] font-sans text-theme-muted font-semibold mr-0.5">Size:</span>
              <button
                onClick={() => handleAdjustBoardWidth(-30)}
                title="Decrease board size"
                className="p-1 rounded-xs hover:bg-theme-panel text-theme-muted hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={handleResetBoardWidth}
                title="Fit to screen (Auto)"
                suppressHydrationWarning
                className={`text-[11px] font-mono px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                  userBoardWidth === null ? 'bg-theme-accent text-white font-bold' : 'text-theme-sec hover:text-white'
                }`}
              >
                {userBoardWidth ? `${userBoardWidth}px` : 'Auto'}
              </button>
              <button
                onClick={() => handleAdjustBoardWidth(30)}
                title="Increase board size"
                className="p-1 rounded-xs hover:bg-theme-panel text-theme-muted hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Move History & Controls */}
        <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 flex flex-col gap-3">
          
          {/* Game Over Banner */}
          {gameResult && (
            <div className="p-3.5 rounded-sm bg-theme-panel border-2 border-theme-accent shadow-xl animate-fadeIn text-center">
              <h3 className="text-base font-black uppercase text-white flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>{gameResult}</span>
              </h3>
              <p className="text-xs text-theme-sec mt-0.5">{gameOverReason}</p>
              {onAnalyzeGame && historyMoves.length > 0 && (
                <button
                  onClick={() =>
                    onAnalyzeGame(historyMoves, null, {
                      white: { username: 'Player 1 (White)', rating: null, avatar: null },
                      black: { username: 'Player 2 (Black)', rating: null, avatar: null },
                    })
                  }
                  className="w-full mt-3 py-2 px-3 rounded-sm font-bold text-xs btn-chess-green flex items-center justify-center gap-1.5 shadow"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Review Game</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  onClick={handleCopyFen}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Copy current position FEN"
                >
                  {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
                </button>
                <button
                  onClick={handleCopyPgn}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Copy complete game PGN"
                >
                  {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Move History Table */}
          <div className="h-[280px]">
            <MoveHistory
              moves={historyMoves}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={handleSelectMove}
              onFirst={() => handleSelectMove(-1)}
              onPrev={() => handleSelectMove(Math.max(-1, currentMoveIndex - 1))}
              onNext={() => handleSelectMove(Math.min(historyMoves.length - 1, currentMoveIndex + 1))}
              onLast={() => handleSelectMove(historyMoves.length - 1)}
            />
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <button
              onClick={startNewGame}
              className="w-full py-3 sm:py-2.5 px-4 rounded-sm font-bold text-sm btn-chess-green flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Game</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const resigningPlayer = chess.turn() === 'w' ? 'White' : 'Black';
                  const winningPlayer = chess.turn() === 'w' ? 'Black' : 'White';
                  handleGameOver(`${winningPlayer} Wins!`, `${resigningPlayer} resigned.`);
                }}
                disabled={gameResult !== null}
                className="py-2.5 sm:py-2 px-2 sm:px-2.5 rounded-sm text-xs font-bold btn-chess-danger disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Flag className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Resign</span>
              </button>
              <button
                onClick={() => handleGameOver('Draw Agreed', 'Mutual draw agreement.')}
                disabled={gameResult !== null}
                className="py-2.5 sm:py-2 px-2 sm:px-2.5 rounded-sm text-xs font-bold btn-chess-draw disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Handshake className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Draw</span>
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="py-2.5 sm:py-2 px-2 sm:px-2.5 rounded-sm text-xs font-bold btn-chess-flip flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Flip</span>
              </button>
            </div>

            {/* Auto Flip option */}
            <div className="flex items-center justify-between px-3 py-2 bg-theme-panel rounded-sm border border-theme-border text-xs text-theme-sec">
              <span>Auto-flip on each turn:</span>
              <button
                onClick={() => setAutoFlip(!autoFlip)}
                className={`px-3 py-1 rounded-xs font-bold transition-all ${
                  autoFlip ? 'bg-theme-accent text-white shadow' : 'bg-theme-sub text-theme-muted hover:text-white border border-theme-border'
                }`}
              >
                {autoFlip ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
