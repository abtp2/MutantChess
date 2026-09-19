// Authentic Chess.com style Play vs Computer view with synchronized board and White-activated timer
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import EvalBar from './EvalBar';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import { BOTS, getBotSettingsForElo, getThinkingTimeForElo } from '../lib/bots';
import { stockfishService } from '../lib/stockfishService';
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playCastleSound,
  playGameEndSound,
} from '../lib/audio';
import {
  RotateCcw,
  Flag,
  Handshake,
  Bot,
  Sliders,
  BarChart2,
  ChevronDown,
  RefreshCw,
  Trophy,
  ShieldAlert,
  Play,
  User,
  Copy,
  Check,
  Clock,
  Minus,
  Plus,
} from 'lucide-react';
import BotAvatar from './BotAvatar';

export default function PlayAI({
  boardThemeId = 'stone',
  onAnalyzeGame,
}) {
  const [chess, setChess] = useState(() => new Chess());
  const [historyMoves, setHistoryMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [playerColor, setPlayerColor] = useState('w'); // 'w' or 'b'
  const [selectedBot, setSelectedBot] = useState(BOTS[1] || BOTS[0]); // Ashutosh_dev (1000 Elo)
  const [customElo, setCustomElo] = useState(1000);
  const [useCustomElo, setUseCustomElo] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [gameOverReason, setGameOverReason] = useState('');
  const [gameOverType, setGameOverType] = useState(null); // 'checkmate' | 'resignation' | 'timeout' | 'draw'
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [evalScore, setEvalScore] = useState({ cp: 0, mate: null });
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [botMessage, setBotMessage] = useState((BOTS[1] || BOTS[0]).quotes.start[0]);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('game'); // 'game' | 'moves' | 'settings'
  const [isFlipped, setIsFlipped] = useState(false);
  const [boardHeight, setBoardHeight] = useState(560);
  const [premoveQueue, setPremoveQueue] = useState([]);
  const [userBoardWidth, setUserBoardWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mutantchess_board_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 1000) return parsed;
      }
    }
    return null;
  });

  const handleAdjustBoardWidth = (delta) => {
    const current = userBoardWidth || boardHeight || 560;
    const nextWidth = Math.max(340, Math.min(1000, current + delta));
    setUserBoardWidth(nextWidth);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mutantchess_board_width', nextWidth.toString());
    }
  };

  const handleResetBoardWidth = () => {
    setUserBoardWidth(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mutantchess_board_width');
    }
  };

  // Clocks - Start timer ONLY after White's first move is played!
  const [playerTime, setPlayerTime] = useState(600);
  const [botTime, setBotTime] = useState(600);
  const [isTimerStarted, setIsTimerStarted] = useState(false);

  const chessRef = useRef(chess);
  chessRef.current = chess;

  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;

  const gameResultRef = useRef(gameResult);
  gameResultRef.current = gameResult;

  const premoveQueueRef = useRef([]);
  premoveQueueRef.current = premoveQueue;

  const isBotThinkingRef = useRef(false);
  isBotThinkingRef.current = isBotThinking;

  const handleCancelPremoves = () => {
    premoveQueueRef.current = [];
    setPremoveQueue([]);
  };

  // Helper to force active color in FEN
  const setFenTurn = (fen, targetColor) => {
    if (!fen) return fen;
    const parts = fen.split(' ');
    if (parts.length >= 2) {
      parts[1] = targetColor;
      if (parts.length >= 4 && parts[3] !== '-') {
        parts[3] = '-';
      }
      return parts.join(' ');
    }
    return fen;
  };

  // Virtual board that reflects live game + all queued premoves
  const displayChess = React.useMemo(() => {
    if (!chess) return new Chess();

    if (chess.turn() === playerColor && !isBotThinking && premoveQueue.length === 0) {
      return chess;
    }

    try {
      let fen = setFenTurn(chess.fen(), playerColor);
      let virtualBoard = new Chess(fen);

      for (const pm of premoveQueue) {
        const fenBefore = setFenTurn(virtualBoard.fen(), playerColor);
        virtualBoard = new Chess(fenBefore);
        const res = virtualBoard.move({
          from: pm.from,
          to: pm.to,
          promotion: pm.promotion || 'q',
        });
        if (!res) break;
      }

      const finalFen = setFenTurn(virtualBoard.fen(), playerColor);
      return new Chess(finalFen);
    } catch (e) {
      return chess;
    }
  }, [chess, playerColor, isBotThinking, premoveQueue]);

  const playMoveAudio = (res) => {
    if (chessRef.current.isGameOver()) {
      const isWinner = (chessRef.current.turn() !== playerColorRef.current) && chessRef.current.isCheckmate();
      playGameEndSound(isWinner);
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

  // Timer countdown: Persistent 1-second ticker that ticks continuously while either side thinks!
  useEffect(() => {
    if (gameResult || !isTimerStarted) return;

    const interval = setInterval(() => {
      if (gameResultRef.current || !chessRef.current) return;
      const turn = chessRef.current.turn();
      const pColor = playerColorRef.current;

      if (turn === pColor) {
        setPlayerTime((t) => {
          if (t <= 1) {
            handleGameOver('loss', 'Time out! Bot won on time.', 'timeout');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBotTime((t) => {
          if (t <= 1) {
            handleGameOver('win', 'Bot ran out of time! You win.', 'timeout');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerStarted, gameResult]);

  const handleGameOver = (result, reason, type = null) => {
    handleCancelPremoves();
    setGameResult(result);
    setGameOverReason(reason);

    const inferredType = type || (
      reason?.toLowerCase().includes('resign') ? 'resignation' :
      reason?.toLowerCase().includes('time') ? 'timeout' :
      reason?.toLowerCase().includes('checkmate') ? 'checkmate' : 'draw'
    );
    setGameOverType(inferredType);

    if (result === 'win') {
      const quote = selectedBot.quotes?.loss?.[Math.floor(Math.random() * (selectedBot.quotes.loss?.length || 1))] || 'Good game! You played well.';
      setBotMessage(quote);
      playGameEndSound(true);
    } else if (result === 'loss') {
      if (inferredType === 'resignation') {
        const quote = selectedBot.quotes?.win?.[0] || 'Good game! Thanks for the match.';
        setBotMessage(quote);
      } else if (inferredType === 'timeout') {
        setBotMessage('Time is up! Good game.');
      } else {
        const quote = selectedBot.quotes?.win?.[Math.floor(Math.random() * (selectedBot.quotes.win?.length || 1))] || 'Checkmate! Good game.';
        setBotMessage(quote);
      }
      playGameEndSound(false);
    } else {
      setBotMessage('A well fought draw!');
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
      c.header(
        'Event', 'MutantChess Match',
        'Site', 'MutantChess',
        'Date', new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        'White', playerColor === 'w' ? 'You' : selectedBot.name,
        'Black', playerColor === 'w' ? selectedBot.name : 'You',
        'Result', gameResult === 'win' ? (playerColor === 'w' ? '1-0' : '0-1') : gameResult === 'loss' ? (playerColor === 'w' ? '0-1' : '1-0') : gameResult === 'draw' ? '1/2-1/2' : '*'
      );
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

  const trackCaptured = (res) => {
    if (res.captured) {
      const capturedObj = { type: res.captured, color: res.color === 'w' ? 'b' : 'w' };
      if (res.color === 'w') {
        setCapturedWhite((prev) => [...prev, capturedObj]);
      } else {
        setCapturedBlack((prev) => [...prev, capturedObj]);
      }
    }
  };

  // Bot move trigger with guaranteed legal fallback to prevent any engine freeze
  const triggerBotMove = async (currentChess) => {
    if (!currentChess || currentChess.isGameOver()) return;
    if (currentChess.turn() === playerColorRef.current) return;
    setIsBotThinking(true);
    isBotThinkingRef.current = true;

    // Ensure timer is ticking while bot calculates
    if (!isTimerStarted) {
      setIsTimerStarted(true);
    }

    const activeElo = useCustomElo ? customElo : selectedBot.elo;
    const settings = getBotSettingsForElo(activeElo);
    const skillLevel = useCustomElo ? settings.skillLevel : selectedBot.skillLevel;
    const depth = useCustomElo ? settings.depth : selectedBot.depth;
    const moveTime = useCustomElo ? settings.moveTime : selectedBot.moveTime;

    const moveCount = Math.floor(currentChess.history().length / 2) + 1;
    const targetThinkingTime = getThinkingTimeForElo(activeElo, moveCount);
    const startTime = Date.now();

    try {
      const botMove = await stockfishService.getBestMove({
        fen: currentChess.fen(),
        elo: activeElo,
        skillLevel,
        depth,
        moveTime,
      });

      // Deliberate realistic calculation time based on bot Elo
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, targetThinkingTime - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      if (!gameResultRef.current) {
        const nextChess = new Chess(currentChess.fen());
        let res = null;

        // Try primary bot move
        if (botMove && botMove.from && botMove.to) {
          try {
            res = nextChess.move({
              from: botMove.from,
              to: botMove.to,
              promotion: botMove.promotion || 'q',
            });
          } catch (e) {}
        }

        // Failsafe Layer 1: Heuristic fallback calculator
        if (!res) {
          const fallback = stockfishService.calculateFallbackMove(currentChess.fen(), activeElo);
          if (fallback) {
            try {
              res = nextChess.move({
                from: fallback.from,
                to: fallback.to,
                promotion: fallback.promotion || 'q',
              });
            } catch (e) {}
          }
        }

        // Failsafe Layer 2: Any available legal move to guarantee zero freeze
        if (!res) {
          const legals = nextChess.moves({ verbose: true });
          if (legals.length > 0) {
            res = nextChess.move(legals[0]);
          }
        }

        if (res) {
          trackCaptured(res);
          setChess(nextChess);
          chessRef.current = nextChess;
          setLastMove({ from: res.from, to: res.to });
          setHistoryMoves((prev) => [...prev, res]);
          setCurrentMoveIndex((prev) => prev + 1);
          playMoveAudio(res);

          if (res.captured && selectedBot.quotes.capture) {
            setBotMessage(selectedBot.quotes.capture[Math.floor(Math.random() * selectedBot.quotes.capture.length)]);
          } else if (nextChess.inCheck() && selectedBot.quotes.check) {
            setBotMessage(selectedBot.quotes.check[Math.floor(Math.random() * selectedBot.quotes.check.length)]);
          }

          if (nextChess.isGameOver()) {
            handleCancelPremoves();
            if (nextChess.isCheckmate()) {
              handleGameOver('loss', 'Checkmate! Bot won.');
            } else if (nextChess.isDraw()) {
              handleGameOver('draw', 'Draw by stalemate or repetition.');
            }
          } else {
            // Bot move completed!
            setIsBotThinking(false);
            isBotThinkingRef.current = false;

            // Check if there are queued premoves to execute immediately!
            if (premoveQueueRef.current.length > 0) {
              setTimeout(() => {
                processNextPremove(nextChess);
              }, 50);
            } else {
              updateEval(nextChess.fen());
            }
          }
        }
      }
    } catch (e) {
      console.error('Bot move failed', e);
    } finally {
      setIsBotThinking(false);
      isBotThinkingRef.current = false;
    }
  };

  const updateEval = async (fen) => {
    try {
      const evaluation = await stockfishService.evaluatePosition({ fen, depth: 8 });
      setEvalScore({ cp: evaluation.cp, mate: evaluation.mate });
    } catch (e) {}
  };

  // Process the next queued premove in FIFO order
  const processNextPremove = (baseChess) => {
    if (gameResultRef.current) return false;
    if (isBotThinkingRef.current) return false;

    const queue = premoveQueueRef.current;
    if (!queue || queue.length === 0) return false;

    const activeChess = baseChess || chessRef.current;
    if (!activeChess) return false;

    // Must be player's turn to execute a premove on the live board
    if (activeChess.turn() !== playerColorRef.current) return false;
    if (activeChess.isGameOver()) return false;

    const [headPremove, ...tailPremoves] = queue;
    try {
      const test = new Chess(activeChess.fen());
      const valid = test.move({
        from: headPremove.from,
        to: headPremove.to,
        promotion: headPremove.promotion || 'q',
      });

      if (valid) {
        // Valid premove! Pop head synchronously and execute
        premoveQueueRef.current = tailPremoves;
        setPremoveQueue(tailPremoves);
        return executePlayerMove(headPremove, activeChess);
      } else {
        // Illegal premove in this position: cancel all premoves like Chess.com
        handleCancelPremoves();
        updateEval(activeChess.fen());
        return false;
      }
    } catch (e) {
      handleCancelPremoves();
      updateEval(activeChess.fen());
      return false;
    }
  };

  // Reactive premove consumer: ensures queued premoves NEVER get stranded when it is player's turn
  useEffect(() => {
    if (gameResult || isBotThinking) return;
    if (chess.turn() !== playerColor) return;
    if (premoveQueue.length > 0) {
      const timer = setTimeout(() => {
        processNextPremove(chess);
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [chess, isBotThinking, playerColor, premoveQueue, gameResult]);

  // Execute a validated player move (from live turn or premove)
  const executePlayerMove = ({ from, to, promotion = 'q' }, baseChess) => {
    const currentActiveChess = baseChess || chessRef.current;
    try {
      const next = new Chess(currentActiveChess.fen());
      const res = next.move({ from, to, promotion });
      if (!res) {
        handleCancelPremoves();
        return false;
      }

      // Start timer on White's first move!
      if (!isTimerStarted) {
        setIsTimerStarted(true);
      }

      trackCaptured(res);
      setChess(next);
      chessRef.current = next; // Synchronous ref update!
      setLastMove({ from, to });
      setHistoryMoves((prev) => [...prev, res]);
      setCurrentMoveIndex((prev) => prev + 1);
      playMoveAudio(res);

      if (next.isGameOver()) {
        handleCancelPremoves();
        if (next.isCheckmate()) {
          handleGameOver('win', 'Checkmate! You won!');
        } else if (next.isDraw()) {
          handleGameOver('draw', 'Draw!');
        }
        return true;
      }

      updateEval(next.fen());

      // Mark bot as thinking synchronously
      setIsBotThinking(true);
      isBotThinkingRef.current = true;

      // Trigger bot move
      setTimeout(() => {
        triggerBotMove(next);
      }, 50);

      return true;
    } catch (err) {
      handleCancelPremoves();
      return false;
    }
  };

  // Live player move handler
  const handlePlayerMove = (move) => {
    if (gameResult || isBotThinking) return false;
    if (chess.turn() !== playerColor) return false;

    // If reviewing earlier moves, snap to latest move before allowing next play
    if (historyMoves.length > 0 && currentMoveIndex !== historyMoves.length - 1) {
      handleSelectMove(historyMoves.length - 1);
      return false;
    }

    return executePlayerMove(move, chess);
  };

  // Board move router: handles live moves smoothly
  const handleBoardMove = ({ from, to, promotion = 'q' }) => {
    if (gameResult || isBotThinkingRef.current) return false;

    // If reviewing earlier moves, snap to latest move
    if (historyMoves.length > 0 && currentMoveIndex !== historyMoves.length - 1) {
      handleSelectMove(historyMoves.length - 1);
      return false;
    }

    const currentActiveChess = chessRef.current || chess;
    if (currentActiveChess.turn() !== playerColorRef.current) {
      return false;
    }

    return executePlayerMove({ from, to, promotion }, currentActiveChess);
  };

  const startNewGame = (color = playerColor, bot = selectedBot) => {
    handleCancelPremoves();
    const fresh = new Chess();
    setChess(fresh);
    chessRef.current = fresh;
    setHistoryMoves([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setGameResult(null);
    gameResultRef.current = null;
    setGameOverReason('');
    setGameOverType(null);
    setCopiedFen(false);
    setCopiedPgn(false);
    setIsBotThinking(false);
    isBotThinkingRef.current = false;
    setCapturedWhite([]);
    setCapturedBlack([]);
    setEvalScore({ cp: 0, mate: null });
    
    setPlayerColor(color);
    playerColorRef.current = color;

    // Reset clocks
    setPlayerTime(600);
    setBotTime(600);

    setIsFlipped(color === 'b');
    setBotMessage(bot.quotes.start[Math.floor(Math.random() * bot.quotes.start.length)]);

    if (color === 'b') {
      // Bot is White: clock starts immediately and bot begins calculating move 1!
      setIsTimerStarted(true);
      setTimeout(() => {
        triggerBotMove(fresh);
      }, 150);
    } else {
      // Human is White: clock starts when White makes move 1
      setIsTimerStarted(false);
    }
  };

  const handleSelectBot = (bot) => {
    setSelectedBot(bot);
    setCustomElo(bot.elo);
    setUseCustomElo(false);
    setShowBotPicker(false);
    startNewGame(playerColor, bot);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectMove = (index) => {
    if (index < -1 || index >= historyMoves.length) return;
    handleCancelPremoves();
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

  const isPlayerTurn = chess.turn() === playerColor;

  return (
    <div className="w-full max-w-[1680px] mx-auto px-1 sm:px-3 py-1 sm:py-3 select-none animate-fadeIn">
      
      {/* Responsive Layout: Board + Controls */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6 w-full">
        
        {/* Board Column: Takes maximum remaining space */}
        <div className="flex-1 flex flex-col items-center min-w-0 w-full">
          
          {/* Top Opponent (Bot) Card */}
          <div 
            className="w-full mb-2 px-3 sm:px-4 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveTab('settings')}
                className="cursor-pointer hover:scale-105 transition-transform"
                title="Change Opponent in Settings"
              >
                <BotAvatar bot={selectedBot} size="md" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-theme-text">
                    {useCustomElo ? 'Custom Bot' : selectedBot.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-theme-muted">
                    ({useCustomElo ? customElo : selectedBot.elo})
                  </span>
                </div>
                <CapturedPieces
                  captured={playerColor === 'w' ? capturedBlack : capturedWhite}
                  playerColor={playerColor === 'w' ? 'b' : 'w'}
                />
              </div>
            </div>

            {/* Clock */}
            <div className="flex items-center gap-2">
              {isBotThinking && (
                <div className="text-[11px] font-medium text-theme-accent flex items-center gap-1 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thinking...</span>
                </div>
              )}
              <div
                className={`font-mono text-base sm:text-lg font-bold px-4 py-1.5 rounded-sm border transition-colors ${
                  isTimerStarted && !isPlayerTurn && !gameResult
                    ? 'bg-theme-accent text-white border-theme-accent'
                    : 'bg-theme-sidebar text-theme-sec border-theme-border'
                }`}
              >
                {formatTime(botTime)}
              </div>
            </div>
          </div>

          {/* Board with integrated zero-gap Eval Bar */}
          <div className="w-full flex justify-center">
            <ChessBoard
              evalBar={
                <EvalBar
                  cp={evalScore.cp}
                  mate={evalScore.mate}
                  isFlipped={isFlipped}
                  height={boardHeight}
                />
              }
              chess={chess}
              onMove={handleBoardMove}
              playerColor={playerColor}
              isFlipped={isFlipped}
              themeId={boardThemeId}
              lastMove={lastMove}
              disabled={isBotThinking || gameResult !== null}
              onBoardWidthChange={setBoardHeight}
              customBoardWidth={userBoardWidth}
              premoveQueue={premoveQueue}
              onCancelPremoves={handleCancelPremoves}
            />
          </div>

          {/* Bottom Player (You) Card */}
          <div 
            className="w-full mt-2 px-3 sm:px-4 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-theme-sub border border-theme-border shrink-0 flex items-center justify-center text-theme-sec">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-theme-text">You</span>
                </div>
                <CapturedPieces
                  captured={playerColor === 'w' ? capturedWhite : capturedBlack}
                  playerColor={playerColor}
                />
              </div>
            </div>

            {/* Player Clock */}
            <div
              className={`font-mono text-base sm:text-lg font-bold px-4 py-1.5 rounded-sm border transition-colors ${
                isTimerStarted && isPlayerTurn && !gameResult
                  ? 'bg-theme-accent text-white border-theme-accent'
                  : 'bg-theme-sidebar text-theme-sec border-theme-border'
              }`}
            >
              {formatTime(playerTime)}
            </div>
          </div>

          {/* Board Controls Bar: Move indicator, Flip Board, and Board Size Controls */}
          <div 
            className="w-full mt-2 px-3 sm:px-4 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between text-xs font-mono shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            {/* Left: Move number & Flip Board button */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xs bg-theme-sub border border-theme-border text-xs font-bold font-mono text-theme-sec">
                {historyMoves.length > 0 ? `Move ${Math.ceil(historyMoves.length / 2)}` : 'Start Position'}
              </span>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                title="Flip board view"
                className="px-2.5 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border hover:border-theme-borderLight transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sans font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 text-theme-sec" />
                <span>Flip</span>
              </button>
            </div>

            {/* Right: Board Size Controls (- Auto / 400px +) */}
            <div className="flex items-center gap-1 bg-theme-sub px-2 py-0.5 rounded-xs border border-theme-border">
              <span className="text-[11px] font-sans text-theme-muted font-semibold mr-0.5 hidden sm:inline">Size:</span>
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

        {/* Right Column: Sidebar with Game / Moves / Settings Tabs */}
        <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 flex flex-col gap-3">
          
          {/* Top Tabs */}
          <div className="flex border-b border-theme-border text-sm font-semibold">
            <button
              onClick={() => setActiveTab('game')}
              className={`flex-1 pb-3 text-center transition-colors relative cursor-pointer ${
                activeTab === 'game' ? 'text-white font-bold' : 'text-theme-muted hover:text-white'
              }`}
            >
              Game
              {activeTab === 'game' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-accent" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('moves')}
              className={`flex-1 pb-3 text-center transition-colors relative cursor-pointer ${
                activeTab === 'moves' ? 'text-white font-bold' : 'text-theme-muted hover:text-white'
              }`}
            >
              Moves {historyMoves.length > 0 ? `(${Math.ceil(historyMoves.length / 2)})` : ''}
              {activeTab === 'moves' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-accent" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 pb-3 text-center transition-colors relative cursor-pointer ${
                activeTab === 'settings' ? 'text-white font-bold' : 'text-theme-muted hover:text-white'
              }`}
            >
              Settings
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-accent" />
              )}
            </button>
          </div>

          {/* TAB 1: GAME */}
          {activeTab === 'game' && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Quote Card */}
              <div className="p-6 bg-theme-panel rounded-sm border border-theme-border relative flex flex-col items-center justify-center text-center min-h-[140px]">
                <span className="absolute top-3 left-4 text-2xl font-serif text-theme-accent select-none">“</span>
                <p className="text-sm font-medium text-theme-sec px-4 leading-relaxed">
                  {botMessage || "Let's write some clean code on 64 squares!"}
                </p>
                <span className="text-xs text-theme-muted mt-2.5 font-mono">
                  — {selectedBot.name}
                </span>
                <span className="absolute bottom-3 right-4 text-2xl font-serif text-theme-accent select-none">”</span>
              </div>

              {/* Game Over Banner */}
              {gameResult && (
                <div className="p-4 rounded-sm bg-theme-panel border border-theme-border text-center animate-fadeIn">
                  <h3 className="text-base font-black uppercase text-white flex items-center justify-center gap-2">
                    {gameResult === 'win' ? (
                      <>
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>You Won!</span>
                      </>
                    ) : gameResult === 'loss' ? (
                      gameOverType === 'resignation' ? (
                        <>
                          <Flag className="w-5 h-5 text-red-400" />
                          <span>You Resigned</span>
                        </>
                      ) : gameOverType === 'timeout' ? (
                        <>
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span>Time Out</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-5 h-5 text-red-400" />
                          <span>Checkmate</span>
                        </>
                      )
                    ) : (
                      <>
                        <Handshake className="w-5 h-5 text-blue-400" />
                        <span>Draw</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-theme-sec mt-1 font-medium">{gameOverReason}</p>
                  
                  {/* Banner Actions */}
                  <div className="flex flex-col gap-2 mt-3">
                    {onAnalyzeGame && historyMoves.length > 0 && (
                      <button
                        onClick={() =>
                          onAnalyzeGame(historyMoves, null, {
                            white:
                              playerColor === 'w'
                                ? { username: 'You', rating: 'Player', avatar: null }
                                : { username: selectedBot.name, rating: selectedBot.elo, avatar: selectedBot.avatar },
                            black:
                              playerColor === 'w'
                                ? { username: selectedBot.name, rating: selectedBot.elo, avatar: selectedBot.avatar }
                                : { username: 'You', rating: 'Player', avatar: null },
                          })
                        }
                        className="w-full py-2.5 px-3 rounded-sm font-bold text-xs btn-chess-green flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <BarChart2 className="w-4 h-4" />
                        <span>Review Game</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
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
                </div>
              )}

              {/* Large Green Action Button: New Game */}
              <button
                onClick={() => startNewGame(playerColor, selectedBot)}
                className="w-full py-3.5 px-4 rounded-sm font-bold text-base btn-chess-green flex items-center justify-center gap-2 cursor-pointer transition-transform"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>New Game</span>
              </button>

              {/* 3-Column Control Grid: Resign, Draw, Flip (Small-Medium size, current UI theme color) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleGameOver('loss', 'You resigned the game.', 'resignation')}
                  disabled={gameResult !== null}
                  className="py-1.5 px-2 sm:px-2.5 rounded-sm btn-chess-danger disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-xs font-bold"
                  title="Resign the current game"
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Resign</span>
                </button>
                <button
                  onClick={() => handleGameOver('draw', 'Draw agreed.', 'draw')}
                  disabled={gameResult !== null}
                  className="py-1.5 px-2 sm:px-2.5 rounded-sm btn-chess-draw disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-xs font-bold"
                  title="Offer a draw"
                >
                  <Handshake className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Draw</span>
                </button>
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="py-1.5 px-2 sm:px-2.5 rounded-sm btn-chess-flip flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-xs font-bold"
                  title="Flip board orientation"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Flip</span>
                </button>
              </div>

              {/* Copy FEN / PGN Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyFen}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                  title="Copy current position FEN to clipboard"
                >
                  {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
                </button>
                <button
                  onClick={handleCopyPgn}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                  title="Copy game PGN to clipboard"
                >
                  {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
                </button>
              </div>

              {/* Play as White / Black Segmented Toggle */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-theme-sec font-semibold">Play as:</span>
                <div className="flex bg-theme-sidebar p-1 rounded-sm border border-theme-border gap-1">
                  <button
                    onClick={() => { setPlayerColor('w'); startNewGame('w', selectedBot); }}
                    className={`px-4 py-1.5 rounded-xs text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      playerColor === 'w'
                        ? 'bg-white text-gray-950 shadow-xs'
                        : 'text-theme-muted hover:text-white hover:bg-theme-panel'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400" />
                    <span>White</span>
                  </button>
                  <button
                    onClick={() => { setPlayerColor('b'); startNewGame('b', selectedBot); }}
                    className={`px-4 py-1.5 rounded-xs text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      playerColor === 'b'
                        ? 'bg-[#181614] text-white border border-[#4a4742] shadow-xs'
                        : 'text-theme-muted hover:text-white hover:bg-theme-panel'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600" />
                    <span>Black</span>
                  </button>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-right text-[11px] text-theme-muted pt-2 flex items-center justify-end gap-1 select-none">
                <span>Built for thinkers</span>
                <span className="text-theme-accent">♡</span>
              </div>
            </div>
          )}

          {/* TAB 2: MOVES */}
          {activeTab === 'moves' && (
            <div className="flex flex-col gap-3 animate-fadeIn">
              <div className="h-[360px]">
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

              {onAnalyzeGame && historyMoves.length > 0 && (
                <button
                  onClick={() => onAnalyzeGame(historyMoves)}
                  className="w-full py-2.5 px-3 rounded-sm font-bold text-xs btn-chess-green flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Analyze Move History</span>
                </button>
              )}

              {/* Copy FEN / PGN Buttons in Moves Tab */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyFen}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                  title="Copy current position FEN to clipboard"
                >
                  {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
                </button>
                <button
                  onClick={handleCopyPgn}
                  className="py-2 px-3 rounded-sm btn-chess-utility flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                  title="Copy game PGN to clipboard"
                >
                  {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
                  <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS (Bot Selection & Custom Elo) */}
          {activeTab === 'settings' && (
            <div className="p-4 bg-theme-panel rounded-sm border border-theme-border space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-theme-border pb-2">
                <span className="text-xs font-bold text-theme-text uppercase tracking-wider">Select Opponent Bot</span>
                <span className="text-xs text-theme-muted font-mono">{BOTS.length} Bots Available</span>
              </div>

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                {BOTS.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => handleSelectBot(bot)}
                    className={`w-full p-2.5 rounded-sm flex items-center justify-between text-left transition-colors cursor-pointer ${
                      selectedBot.id === bot.id && !useCustomElo
                        ? 'bg-theme-sub border border-theme-accent text-white'
                        : 'border border-transparent text-theme-sec hover:bg-theme-sub hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BotAvatar bot={bot} size="sm" />
                      <div>
                        <div className="font-bold text-xs text-theme-text">{bot.name}</div>
                        <div className="text-[10px] text-theme-muted">{bot.title}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-theme-muted">
                      ({bot.elo})
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Elo Slider */}
              <div className="pt-3 border-t border-theme-border space-y-2">
                <div className="flex items-center justify-between text-xs text-theme-sec">
                  <span className="font-semibold">Custom Strength:</span>
                  <span className="font-mono font-bold text-theme-sec">
                    ({customElo})
                  </span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="3000"
                  step="50"
                  value={customElo}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCustomElo(val);
                    setUseCustomElo(true);
                  }}
                  className="w-full cursor-pointer accent-[var(--theme-accent)]"
                />
                <div className="flex justify-between text-[10px] text-theme-muted font-mono">
                  <span>250 (Beginner)</span>
                  <span>1600 (Club)</span>
                  <span>3000 (Grandmaster)</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
