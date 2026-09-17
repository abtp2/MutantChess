// Professional Chess.com style 1 vs 1 Pass and Play with White-triggered clock
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { RotateCcw, Flag, Handshake, Sparkles, RefreshCw, Trophy, ShieldAlert, Copy, Check } from 'lucide-react';

export default function PassAndPlay({
  boardThemeId = 'stone',
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
      const next = new Chess();
      next.loadPgn(chess.pgn());
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
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6 select-none animate-fadeIn">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start justify-center">
        
        {/* Left Column: Board Area */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          
          {/* Top Player Card */}
          <div className="w-full max-w-[640px] mb-2 px-3 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-theme-btn flex items-center justify-center font-bold text-xs text-white border border-theme-border">
                {isFlipped ? 'W' : 'B'}
              </div>
              <div>
                <span className="font-bold text-sm text-theme-text">
                  {isFlipped ? 'Player 1 (White)' : 'Player 2 (Black)'}
                </span>
                <CapturedPieces
                  captured={isFlipped ? capturedWhite : capturedBlack}
                  playerColor={isFlipped ? 'w' : 'b'}
                />
              </div>
            </div>

            <div
              className={`font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-xs transition-colors ${
                isTimerStarted && ((!isFlipped && !isWhiteTurn) || (isFlipped && isWhiteTurn))
                  ? 'bg-theme-accent text-white shadow-md'
                  : 'bg-theme-sub text-theme-sec border border-theme-border'
              }`}
            >
              {formatTime(isFlipped ? whiteTime : blackTime)}
            </div>
          </div>

          {/* ChessBoard */}
          <div className="w-full max-w-[640px] flex justify-center">
            <ChessBoard
              chess={chess}
              onMove={handleMove}
              playerColor={null} // Pass & play allows both sides
              isFlipped={isFlipped}
              themeId={boardThemeId}
              lastMove={lastMove}
              disabled={gameResult !== null}
            />
          </div>

          {/* Bottom Player Card */}
          <div className="w-full max-w-[640px] mt-2 px-3 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-[#ffffff] flex items-center justify-center font-bold text-xs text-gray-900 shadow">
                {isFlipped ? 'B' : 'W'}
              </div>
              <div>
                <span className="font-bold text-sm text-theme-text">
                  {isFlipped ? 'Player 2 (Black)' : 'Player 1 (White)'}
                </span>
                <CapturedPieces
                  captured={isFlipped ? capturedBlack : capturedWhite}
                  playerColor={isFlipped ? 'b' : 'w'}
                />
              </div>
            </div>

            <div
              className={`font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-xs transition-colors ${
                isTimerStarted && ((isFlipped && !isWhiteTurn) || (!isFlipped && isWhiteTurn))
                  ? 'bg-theme-accent text-white shadow-md'
                  : 'bg-theme-sub text-theme-sec border border-theme-border'
              }`}
            >
              {formatTime(isFlipped ? blackTime : whiteTime)}
            </div>
          </div>

        </div>

        {/* Right Column: Move History & Controls */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 w-full">
          
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
                  onClick={() => onAnalyzeGame(historyMoves)}
                  className="w-full mt-3 py-2 px-3 rounded-sm font-bold text-xs btn-chess-green flex items-center justify-center gap-1.5 shadow"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Review Game with Stockfish</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  onClick={handleCopyFen}
                  className="py-2 px-3 rounded-sm bg-theme-sub border border-theme-border hover:bg-theme-panel flex items-center justify-center gap-1.5 text-xs font-semibold text-theme-sec hover:text-white transition-colors cursor-pointer"
                  title="Copy current position FEN"
                >
                  {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
                </button>
                <button
                  onClick={handleCopyPgn}
                  className="py-2 px-3 rounded-sm bg-theme-sub border border-theme-border hover:bg-theme-panel flex items-center justify-center gap-1.5 text-xs font-semibold text-theme-sec hover:text-white transition-colors cursor-pointer"
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
              className="w-full py-2.5 px-4 rounded-sm font-bold text-sm btn-chess-green flex items-center justify-center gap-2 shadow"
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
                className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Resign</span>
              </button>
              <button
                onClick={() => handleGameOver('Draw Agreed', 'Mutual draw agreement.')}
                disabled={gameResult !== null}
                className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Draw</span>
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Flip</span>
              </button>
            </div>

            {/* Copy FEN / PGN Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyFen}
                className="py-2 px-3 rounded-sm bg-theme-panel border border-theme-border hover:bg-theme-sub flex items-center justify-center gap-1.5 text-xs font-semibold text-theme-sec hover:text-white transition-colors cursor-pointer"
                title="Copy current position FEN"
              >
                {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
              </button>
              <button
                onClick={handleCopyPgn}
                className="py-2 px-3 rounded-sm bg-theme-panel border border-theme-border hover:bg-theme-sub flex items-center justify-center gap-1.5 text-xs font-semibold text-theme-sec hover:text-white transition-colors cursor-pointer"
                title="Copy game PGN"
              >
                {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
              </button>
            </div>

            {/* Auto Flip option */}
            <div className="flex items-center justify-between px-3 py-2 bg-theme-panel rounded-sm border border-theme-border text-xs text-theme-sec">
              <span>Auto-flip on each turn:</span>
              <button
                onClick={() => setAutoFlip(!autoFlip)}
                className={`px-3 py-1 rounded-xs font-bold transition-all ${
                  autoFlip ? 'bg-theme-accent text-white shadow' : 'bg-theme-btn text-theme-muted hover:text-white'
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
