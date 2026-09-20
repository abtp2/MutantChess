// Authentic Chess.com style Deep Tactical Analysis & Game Review
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import EvalBar from './EvalBar';
import MoveHistory from './MoveHistory';
import AdvantageGraph from './AdvantageGraph';
import { MOVE_CLASSIFICATIONS, analyzeFullGame, uciToSan, checkBrilliantMove } from '../lib/analysisEngine.js';
import { stockfishService } from '../lib/stockfishService.js';
import {
  BarChart2,
  CheckCircle2,
  Cpu,
  RefreshCw,
  RotateCcw,
  Eye,
  Repeat,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ListOrdered,
  Award,
  Copy,
  Check,
  Minus,
  Plus,
  GitBranch,
  Settings,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DEFAULT_ANALYSIS_DEPTH,
  MIN_ANALYSIS_DEPTH,
  MAX_ANALYSIS_DEPTH,
  DEPTH_PRESETS,
  getStoredAnalysisDepth,
  setStoredAnalysisDepth,
} from '../lib/settings.js';

import CapturedPieces from './CapturedPieces';
import ClassificationIcon from './ClassificationIcon';
import BotAvatar from './BotAvatar';
import { User } from 'lucide-react';
import { fetchPlayerAvatar } from '../lib/gameImporter';

export default function AnalysisBoard({
  initialMoves = [],
  initialFen = null,
  initialGameInfo = null,
  boardThemeId = 'glass',
  onOpenImporter,
}) {
  const [gameInfo, setGameInfo] = useState(initialGameInfo);
  const [moves, setMoves] = useState(initialMoves || []);
  const [originalMoves, setOriginalMoves] = useState(initialMoves || []);
  const [currentStep, setCurrentStep] = useState(() => (initialMoves && initialMoves.length > 0 ? initialMoves.length - 1 : -1));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [originalReviewData, setOriginalReviewData] = useState(null);
  const [liveEval, setLiveEval] = useState({ cp: 0, mate: null, depth: 0, bestMove: null, pv: '' });
  const [bestMoveArrow, setBestMoveArrow] = useState(null);
  const evalSeqRef = useRef(0);

  useEffect(() => {
    setGameInfo(initialGameInfo);
    setMoves(initialMoves || []);
    setOriginalMoves(initialMoves || []);
    setCurrentStep(initialMoves && initialMoves.length > 0 ? initialMoves.length - 1 : -1);
    setReviewData(null);
    setOriginalReviewData(null);
    setShowBestLine(false);
  }, [initialMoves, initialGameInfo, initialFen]);

  const isLineModified = React.useMemo(() => {
    if (!originalMoves || originalMoves.length === 0) return (moves && moves.length > 0);
    if (moves.length !== originalMoves.length) return true;
    for (let i = 0; i < moves.length; i++) {
      const m1 = moves[i].san || (moves[i].from ? `${moves[i].from}${moves[i].to}` : moves[i]);
      const m2 = originalMoves[i].san || (originalMoves[i].from ? `${originalMoves[i].from}${originalMoves[i].to}` : originalMoves[i]);
      if (m1 !== m2) return true;
    }
    return false;
  }, [moves, originalMoves]);

  const handleRevertToOriginal = () => {
    setMoves(originalMoves);
    const step = (originalMoves && originalMoves.length > 0) ? originalMoves.length - 1 : -1;
    setCurrentStep(step);
    const c = new Chess(initialFen || undefined);
    if (originalMoves && originalMoves.length > 0) {
      for (const m of originalMoves) {
        let moveParam = m;
        if (typeof m === 'object' && m !== null) {
          if (m.san) moveParam = m.san;
          else if (m.from && m.to) moveParam = { from: m.from, to: m.to, promotion: (m.promotion || 'q').toLowerCase() };
        }
        try {
          c.move(moveParam);
        } catch (e) {
          break;
        }
      }
    }
    setChess(c);
    setShowBestLine(false);
    setReviewData(originalReviewData);
  };

  // Fetch missing avatars for players if imported from chess.com or lichess
  useEffect(() => {
    if (!gameInfo) return;
    const isImportedSite = gameInfo.site === 'chesscom' || gameInfo.site === 'lichess' || gameInfo.site === 'chess.com';
    if (!isImportedSite) return;

    if (gameInfo.white?.username && !gameInfo.white?.avatar) {
      fetchPlayerAvatar(gameInfo.white.username, gameInfo.site).then((avatar) => {
        if (avatar) {
          setGameInfo((prev) => (prev ? {
            ...prev,
            white: { ...prev.white, avatar },
          } : prev));
        }
      });
    }

    if (gameInfo.black?.username && !gameInfo.black?.avatar) {
      fetchPlayerAvatar(gameInfo.black.username, gameInfo.site).then((avatar) => {
        if (avatar) {
          setGameInfo((prev) => (prev ? {
            ...prev,
            black: { ...prev.black, avatar },
          } : prev));
        }
      });
    }
  }, [gameInfo?.white?.username, gameInfo?.black?.username, gameInfo?.site]);
  const [showBestLine, setShowBestLine] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [boardHeight, setBoardHeight] = useState(560);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'moves' | 'graph' | 'settings'
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [userBoardWidth, setUserBoardWidth] = useState(null);
  const [engineDepth, setEngineDepth] = useState(DEFAULT_ANALYSIS_DEPTH);

  useEffect(() => {
    setEngineDepth(getStoredAnalysisDepth());
    const onDepthChanged = (e) => {
      if (e.detail) setEngineDepth(e.detail);
    };
    window.addEventListener('analysis_depth_changed', onDepthChanged);
    return () => window.removeEventListener('analysis_depth_changed', onDepthChanged);
  }, []);

  const handleDepthChange = (newDepth) => {
    const clamped = setStoredAnalysisDepth(newDepth);
    setEngineDepth(clamped);
  };

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
    const nextWidth = Math.max(340, Math.min(1000, current + delta));
    setUserBoardWidth(nextWidth);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mutantchess_board_width', nextWidth.toString());
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

  // Position history derived synchronously
  const fensHistory = React.useMemo(() => {
    const c = new Chess(initialFen || undefined);
    const fens = [c.fen()];
    for (const m of moves) {
      let moveParam = m;
      if (typeof m === 'object' && m !== null) {
        if (m.san) moveParam = m.san;
        else if (m.from && m.to) moveParam = { from: m.from, to: m.to, promotion: (m.promotion || 'q').toLowerCase() };
      }
      try {
        const res = c.move(moveParam);
        if (res) fens.push(c.fen());
        else break;
      } catch (e) {
        break;
      }
    }
    return fens;
  }, [moves, initialFen]);

  const [chess, setChess] = useState(() => {
    const c = new Chess(initialFen || undefined);
    if (initialMoves && initialMoves.length > 0) {
      for (const m of initialMoves) {
        let moveParam = m;
        if (typeof m === 'object' && m !== null) {
          if (m.san) moveParam = m.san;
          else if (m.from && m.to) moveParam = { from: m.from, to: m.to, promotion: (m.promotion || 'q').toLowerCase() };
        }
        try {
          const res = c.move(moveParam);
          if (!res) break;
        } catch (e) {
          break;
        }
      }
    }
    return c;
  });

  const currentClassifiedMove = reviewData && currentStep >= 0 ? reviewData.classifiedMoves[currentStep] : null;
  const isMistakeOrMiss = Boolean(
    currentClassifiedMove &&
    ['miss', 'blunder', 'mistake', 'inaccuracy'].includes(currentClassifiedMove.classification?.id)
  );

  const handleToggleBestLine = () => {
    const nextShow = !showBestLine;
    setShowBestLine(nextShow);

    if (isMistakeOrMiss) {
      const targetFen = nextShow
        ? (fensHistory[currentStep] || fensHistory[0])
        : (fensHistory[currentStep + 1] || fensHistory[0]);
      setChess(new Chess(targetFen));
    }
  };

  const goToStep = (stepIndex) => {
    setShowBestLine(false);
    const clamped = Math.max(-1, Math.min(moves.length - 1, stepIndex));
    setCurrentStep(clamped);

    const targetFen = fensHistory[clamped + 1] || fensHistory[0];
    setChess(new Chess(targetFen));
  };

  // Evaluate current position live with Stockfish or draw validated best move arrow
  useEffect(() => {
    let active = true;
    const seq = ++evalSeqRef.current;

    const normalFen = fensHistory[currentStep + 1] || fensHistory[0];
    const rewindFen = fensHistory[currentStep] || fensHistory[0];
    const displayedFen = showBestLine && isMistakeOrMiss ? rewindFen : normalFen;

    // 1. Synchronize live evaluation from precomputed review if available and matching displayedFen
    let hasReviewEval = false;
    if (reviewData && reviewData.evaluations) {
      const evalIndex = showBestLine && isMistakeOrMiss ? currentStep : (currentStep + 1);
      const ev = reviewData.evaluations[evalIndex];
      if (ev && (!ev.fen || ev.fen === displayedFen)) {
        setLiveEval(ev);
        hasReviewEval = true;
      }
    }

    // 2. If no precomputed review evaluation available for this position, run live Stockfish evaluation
    if (!hasReviewEval && !isAnalyzing) {
      stockfishService.evaluatePosition({
        fen: displayedFen,
        depth: engineDepth,
        onUpdate: (streamed) => {
          if (!active || evalSeqRef.current !== seq || !streamed) return;
          setLiveEval(streamed);
        },
      }).then((res) => {
        if (!active || evalSeqRef.current !== seq || !res) return;
        setLiveEval(res);

        // If reviewData is active and this move was added/branched, enrich its classification and eval!
        if (reviewData && currentStep >= 0) {
          setReviewData((prev) => {
            if (!prev) return prev;
            const updatedClassified = [...(prev.classifiedMoves || [])];
            if (updatedClassified[currentStep] && !updatedClassified[currentStep].classification) {
              const prevEval = prev.evaluations?.[currentStep]?.cp ?? 0;
              const currEval = res.cp ?? 0;
              const moveColor = updatedClassified[currentStep].color || 'w';

              const evalLoss = moveColor === 'w' ? (prevEval - currEval) : (currEval - prevEval);

              let classification = MOVE_CLASSIFICATIONS.good;
              let coachExplanation = 'A solid exploratory move.';
              if (res.bestMove && res.bestMove.startsWith(updatedClassified[currentStep].from + updatedClassified[currentStep].to)) {
                const moveUci = (
                  (updatedClassified[currentStep].from || '') +
                  (updatedClassified[currentStep].to || '') +
                  (updatedClassified[currentStep].promotion || '')
                ).toLowerCase();
                const lastFen = fensHistory[currentStep];
                const currentFen = displayedFen;

                const isBrilliant = checkBrilliantMove({
                  lastFen,
                  currentFen,
                  moveUci,
                  evaluation: {
                    type: res.mate !== null && res.mate !== undefined ? 'mate' : 'cp',
                    value: res.mate !== null && res.mate !== undefined ? res.mate : (res.cp ?? 0),
                  },
                  previousEvaluation: {
                    type: prev.evaluations?.[currentStep]?.whiteMate ? 'mate' : 'cp',
                    value: prev.evaluations?.[currentStep]?.whiteCp ?? prevEval,
                  },
                  secondEvaluation: undefined,
                  isTopMove: true,
                });

                if (isBrilliant) {
                  classification = MOVE_CLASSIFICATIONS.brilliant;
                  coachExplanation = 'Brilliant move! You offered an intentional piece sacrifice that keeps a winning advantage and cracks open the enemy position.';
                  try {
                    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
                  } catch (e) {}
                } else {
                  classification = MOVE_CLASSIFICATIONS.best;
                  coachExplanation = 'The best move according to the engine!';
                }
              } else if (evalLoss <= 25) {
                classification = MOVE_CLASSIFICATIONS.excellent;
                coachExplanation = 'An excellent move, maintaining the initiative.';
              } else if (evalLoss <= 70) {
                classification = MOVE_CLASSIFICATIONS.good;
                coachExplanation = 'A solid move, keeping balance.';
              } else if (evalLoss <= 150) {
                classification = MOVE_CLASSIFICATIONS.inaccuracy;
                coachExplanation = 'An inaccuracy that allows your opponent some tactical counterplay.';
              } else if (evalLoss <= 300) {
                classification = MOVE_CLASSIFICATIONS.mistake;
                coachExplanation = 'A mistake that compromises piece coordination.';
              } else {
                classification = MOVE_CLASSIFICATIONS.blunder;
                coachExplanation = 'A blunder that drastically alters the evaluation.';
              }

              const pawns = (Math.abs(res.cp) / 100).toFixed(1);
              const scoreDisplay = res.mate ? `M${Math.abs(res.mate)}` : (res.cp > 0 ? `+${pawns}` : `-${pawns}`);

              updatedClassified[currentStep] = {
                ...updatedClassified[currentStep],
                classification,
                coachExplanation,
                scoreDisplay,
                bestMove: res.bestMove,
                bestMoveSan: uciToSan(fensHistory[currentStep] || fensHistory[0], res.bestMove),
              };

              const updatedEvals = [...(prev.evaluations || [])];
              updatedEvals[currentStep + 1] = {
                ...res,
                fen: displayedFen,
                whiteCp: res.cp,
                whiteMate: res.mate,
              };

              return {
                ...prev,
                classifiedMoves: updatedClassified,
                evaluations: updatedEvals,
              };
            }
            return prev;
          });
        }

        if (showBestLine && res.bestMove && res.bestMove.length >= 4) {
          const from = res.bestMove.substring(0, 2);
          const to = res.bestMove.substring(2, 4);
          try {
            const testBoard = new Chess(displayedFen);
            const p = testBoard.get(from);
            if (p && p.color === testBoard.turn()) {
              setBestMoveArrow({ from, to, color: '#81b64c' });
            }
          } catch (e) {}
        }
      });
    }

    // 3. Best move arrow management without early returns to ensure cleanup runs reliably
    if (!showBestLine) {
      setBestMoveArrow(null);
    } else if (isMistakeOrMiss && currentClassifiedMove?.bestMove && currentClassifiedMove.bestMove.length >= 4) {
      const from = currentClassifiedMove.bestMove.substring(0, 2);
      const to = currentClassifiedMove.bestMove.substring(2, 4);
      let arrowSet = false;
      try {
        const testBoard = new Chess(rewindFen);
        const p = testBoard.get(from);
        if (p && p.color === testBoard.turn()) {
          setBestMoveArrow({ from, to, color: '#81b64c' });
          arrowSet = true;
        }
      } catch (e) {}
      if (!arrowSet) setBestMoveArrow(null);
    } else if (reviewData && reviewData.evaluations && reviewData.evaluations[currentStep + 1]) {
      const ev = reviewData.evaluations[currentStep + 1];
      let arrowSet = false;
      if (ev.bestMove && ev.bestMove.length >= 4) {
        const from = ev.bestMove.substring(0, 2);
        const to = ev.bestMove.substring(2, 4);
        try {
          const testBoard = new Chess(normalFen);
          const p = testBoard.get(from);
          if (p && p.color === testBoard.turn()) {
            setBestMoveArrow({ from, to, color: '#81b64c' });
            arrowSet = true;
          }
        } catch (e) {}
      }
      if (!arrowSet) setBestMoveArrow(null);
    } else {
      setBestMoveArrow(null);
    }

    return () => {
      active = false;
    };
  }, [currentStep, fensHistory, reviewData, showBestLine, isMistakeOrMiss, currentClassifiedMove, isAnalyzing, engineDepth]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToStep(currentStep - 1);
      else if (e.key === 'ArrowRight') goToStep(currentStep + 1);
      else if (e.key === 'Home') goToStep(-1);
      else if (e.key === 'End') goToStep(moves.length - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, moves.length]);

  // Allow making exploratory moves on the analysis board
  const handleAnalysisMove = ({ from, to, promotion = 'q' }) => {
    setShowBestLine(false);
    try {
      const next = new Chess(chess.fen());
      const res = next.move({ from, to, promotion });
      if (!res) return false;

      const newMoves = [...moves.slice(0, currentStep + 1), res];
      setMoves(newMoves);
      const nextStep = newMoves.length - 1;
      setCurrentStep(nextStep);
      setChess(next);

      // If reviewData exists, synchronize classifiedMoves and evaluations with the new branch
      if (reviewData) {
        const prevClassified = (reviewData.classifiedMoves || []).slice(0, currentStep + 1);
        const newClassifiedItem = {
          index: nextStep,
          color: res.color,
          san: res.san,
          from: res.from,
          to: res.to,
          fen: next.fen(),
          prevFen: chess.fen(),
          classification: null,
          scoreDisplay: '...',
          bestMove: null,
          bestMoveSan: null,
          coachExplanation: 'Analyzing this exploratory move...',
        };
        const updatedClassified = [...prevClassified, newClassifiedItem];
        const updatedEvals = (reviewData.evaluations || []).slice(0, currentStep + 2);

        setReviewData((prev) => ({
          ...prev,
          classifiedMoves: updatedClassified,
          evaluations: updatedEvals,
        }));
      }

      return true;
    } catch (e) {
      return false;
    }
  };

  const handleCopyFen = async () => {
    try {
      const currentFen = fensHistory[currentStep + 1] || fensHistory[0] || (chess ? chess.fen() : '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentFen);
      } else {
        const el = document.createElement('textarea');
        el.value = currentFen;
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
      const c = new Chess(initialFen || undefined);
      c.header('Event', 'MutantChess Game Review', 'Site', 'MutantChess');
      for (const m of moves) {
        c.move(m.san || m);
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

  const handleStartReview = async () => {
    if (moves.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: moves.length + 1 });

    const targetDepth = Math.max(MIN_ANALYSIS_DEPTH, engineDepth || DEFAULT_ANALYSIS_DEPTH);
    const movetime = Math.max(400, targetDepth * 35);

    try {
      const results = await analyzeFullGame(moves, (prog) => {
        setAnalysisProgress(prog);
      }, { depth: targetDepth, movetime });

      setReviewData(results);
      if (!isLineModified) {
        setOriginalReviewData(results);
      }
      if (results && (results.stats?.w?.brilliant > 0 || results.stats?.b?.brilliant > 0)) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Game review failed', err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const handleRetryMove = () => {
    if (currentStep >= 0) {
      goToStep(currentStep - 1);
    }
  };

  const currentAnnotation = currentClassifiedMove && !(showBestLine && isMistakeOrMiss) && currentClassifiedMove.classification
    ? {
        square: currentClassifiedMove.to,
        classification: currentClassifiedMove.classification,
      }
    : null;

  // Calculate captured pieces dynamically for the active board position
  const capturedPieces = React.useMemo(() => {
    const board = chess.board();
    const starting = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentWhite = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          if (piece.color === 'w') currentWhite[piece.type]++;
          else if (piece.color === 'b') currentBlack[piece.type]++;
        }
      }
    }

    const capturedByWhite = [];
    const capturedByBlack = [];

    ['q', 'r', 'b', 'n', 'p'].forEach((type) => {
      const missingBlack = Math.max(0, starting[type] - currentBlack[type]);
      for (let i = 0; i < missingBlack; i++) {
        capturedByWhite.push({ type, color: 'b' });
      }
      const missingWhite = Math.max(0, starting[type] - currentWhite[type]);
      for (let i = 0; i < missingWhite; i++) {
        capturedByBlack.push({ type, color: 'w' });
      }
    });

    return { capturedByWhite, capturedByBlack };
  }, [chess]);

  const isImportedSite = Boolean(
    gameInfo?.site === 'chesscom' ||
    gameInfo?.site === 'lichess' ||
    gameInfo?.site === 'chess.com'
  );

  const isBotMatch = Boolean(
    gameInfo?.site === 'vs_bot' ||
    gameInfo?.isBotMatch ||
    gameInfo?.bot ||
    gameInfo?.white?.isBot ||
    gameInfo?.black?.isBot
  );

  const buildPlayerData = (playerColor) => {
    const rawData = playerColor === 'w' ? gameInfo?.white : gameInfo?.black;
    const accuracy = playerColor === 'w' ? reviewData?.whiteAccuracy : reviewData?.blackAccuracy;
    const captured = playerColor === 'w' ? capturedPieces.capturedByWhite : capturedPieces.capturedByBlack;
    const isBot = Boolean(rawData?.isBot || (isBotMatch && rawData?.username && rawData.username !== 'You' && rawData.username !== 'Player'));

    if (isImportedSite) {
      return {
        name: rawData?.username || (playerColor === 'w' ? 'White' : 'Black'),
        rating: rawData?.rating || null,
        avatar: rawData?.avatar || null,
        showAvatar: true,
        showRating: Boolean(rawData?.rating),
        isBot: false,
        isUser: false,
        color: playerColor,
        accuracy,
        captured,
      };
    }

    if (isBotMatch && isBot) {
      const botObj = rawData?.bot || gameInfo?.bot || { name: rawData?.username, elo: rawData?.rating, image: rawData?.avatar };
      return {
        name: botObj?.name || rawData?.username || 'AI Bot',
        rating: botObj?.elo || rawData?.rating || '1000',
        avatar: botObj?.image || rawData?.avatar || '/bots/ashutosh_dev.jpg',
        bot: botObj,
        showAvatar: true,
        showRating: true,
        isBot: true,
        isUser: false,
        color: playerColor,
        accuracy,
        captured,
      };
    }

    // Default or user vs bot
    const isUser = rawData?.isUser || rawData?.username === 'You';
    return {
      name: isUser ? 'You' : (rawData?.username || (playerColor === 'w' ? 'White' : 'Black')),
      rating: null,
      avatar: null,
      showAvatar: false,
      showRating: false,
      isBot: false,
      isUser,
      color: playerColor,
      accuracy,
      captured,
    };
  };

  const topPlayer = isFlipped ? buildPlayerData('w') : buildPlayerData('b');
  const bottomPlayer = isFlipped ? buildPlayerData('b') : buildPlayerData('w');

  return (
    <div className="w-full max-w-[1680px] mx-auto px-1 sm:px-3 py-1 sm:py-3 select-none animate-fadeIn">
      
      {/* Responsive Layout: Board Area + Sidebar */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6 w-full">
        
        {/* Left Column: Board Area - Takes maximum remaining space */}
        <div className="flex-1 flex flex-col items-center min-w-0 w-full">
          
          {/* Top Player Card */}
          <div 
            className="w-full mb-1.5 sm:mb-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {topPlayer.isBot ? (
                <>
                  <BotAvatar bot={topPlayer.bot || topPlayer.avatar} size="sm" className="sm:hidden shrink-0" />
                  <BotAvatar bot={topPlayer.bot || topPlayer.avatar} size="md" className="hidden sm:block shrink-0" />
                </>
              ) : topPlayer.showAvatar && topPlayer.avatar ? (
                <img
                  src={topPlayer.avatar}
                  alt={topPlayer.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-sm border border-theme-border object-cover shrink-0"
                />
              ) : topPlayer.isUser ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-theme-sub border border-theme-border flex items-center justify-center font-bold text-sm shrink-0 text-theme-accent">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-sm flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                    topPlayer.color === 'w'
                      ? 'bg-white text-gray-900 border border-gray-300'
                      : 'bg-theme-btn text-white border border-theme-border'
                  }`}
                >
                  {topPlayer.color === 'w' ? 'W' : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-theme-text truncate max-w-[120px] sm:max-w-[220px]">
                    {topPlayer.name}
                  </span>
                  {topPlayer.isBot && (
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-theme-btn border border-theme-border px-1.5 py-0.2 rounded-xs text-theme-sec">
                      BOT
                    </span>
                  )}
                  {topPlayer.showRating && topPlayer.rating && (
                    <span className="text-[11px] sm:text-xs font-mono font-medium text-theme-muted">
                      ({topPlayer.rating})
                    </span>
                  )}
                </div>
                <div className="scale-90 sm:scale-100 origin-left">
                  <CapturedPieces
                    whiteCaptured={capturedPieces.capturedByWhite}
                    blackCaptured={capturedPieces.capturedByBlack}
                    playerColor={topPlayer.color}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Exploratory / Alternate Moves Line Banner */}
          {isLineModified && (
            <div 
              className="w-full px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-center justify-between gap-2 shadow-xs transition-all text-xs"
              style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
            >
              <div className="flex items-center gap-1.5 text-amber-300 font-medium truncate">
                <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">Exploratory line ({moves.length} moves)</span>
              </div>
              <button
                onClick={handleRevertToOriginal}
                className="px-2 py-0.5 rounded-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer active:scale-95"
                title="Reset to the original imported game moves"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Imported</span>
              </button>
            </div>
          )}

          {/* Board with integrated zero-gap Eval Bar */}
          <div className="w-full flex justify-center">
            <ChessBoard
              evalBar={
                <EvalBar
                  cp={liveEval.cp}
                  mate={liveEval.mate}
                  isFlipped={isFlipped}
                  height={boardHeight}
                />
              }
              chess={chess}
              onMove={handleAnalysisMove}
              playerColor={null}
              isFlipped={isFlipped}
              themeId={boardThemeId}
              arrow={bestMoveArrow}
              onBoardWidthChange={setBoardHeight}
              customBoardWidth={userBoardWidth}
              annotation={currentAnnotation}
              lastMove={
                showBestLine && isMistakeOrMiss
                  ? (currentStep > 0 && moves[currentStep - 1]
                      ? { from: moves[currentStep - 1].from, to: moves[currentStep - 1].to }
                      : null)
                  : (currentStep >= 0 && moves[currentStep]
                      ? { from: moves[currentStep].from, to: moves[currentStep].to }
                      : null)
              }
            />
          </div>

          {/* Bottom Player Card */}
          <div 
            className="w-full mt-1.5 sm:mt-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {bottomPlayer.isBot ? (
                <>
                  <BotAvatar bot={bottomPlayer.bot || bottomPlayer.avatar} size="sm" className="sm:hidden shrink-0" />
                  <BotAvatar bot={bottomPlayer.bot || bottomPlayer.avatar} size="md" className="hidden sm:block shrink-0" />
                </>
              ) : bottomPlayer.showAvatar && bottomPlayer.avatar ? (
                <img
                  src={bottomPlayer.avatar}
                  alt={bottomPlayer.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-sm border border-theme-border object-cover shrink-0"
                />
              ) : bottomPlayer.isUser ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-sm bg-theme-sub border border-theme-border flex items-center justify-center font-bold text-sm shrink-0 text-theme-accent">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              ) : (
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-sm flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                    bottomPlayer.color === 'w'
                      ? 'bg-white text-gray-900 border border-gray-300'
                      : 'bg-theme-btn text-white border border-theme-border'
                  }`}
                >
                  {bottomPlayer.color === 'w' ? 'W' : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-theme-text truncate max-w-[120px] sm:max-w-[220px]">
                    {bottomPlayer.name}
                  </span>
                  {bottomPlayer.isBot && (
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-theme-btn border border-theme-border px-1.5 py-0.2 rounded-xs text-theme-sec">
                      BOT
                    </span>
                  )}
                  {bottomPlayer.showRating && bottomPlayer.rating && (
                    <span className="text-[11px] sm:text-xs font-mono font-medium text-theme-muted">
                      ({bottomPlayer.rating})
                    </span>
                  )}
                </div>
                <div className="scale-90 sm:scale-100 origin-left">
                  <CapturedPieces
                    whiteCaptured={capturedPieces.capturedByWhite}
                    blackCaptured={capturedPieces.capturedByBlack}
                    playerColor={bottomPlayer.color}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Board Controls Bar: Move indicator, Flip Board, and Board Size Controls */}
          <div 
            className="w-full mt-1.5 sm:mt-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between text-xs font-mono shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
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

            {/* Right: Board Size Controls (- Auto / 400px +) - hidden on mobile screens */}
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

        {/* Right Column: Review Sidebar */}
        <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 flex flex-col gap-3">
          
          {/* Tabs Navigation */}
          <div className="flex bg-theme-panel border border-theme-border rounded-sm p-1 gap-1">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                activeTab === 'review'
                  ? 'bg-theme-btn text-white shadow-xs'
                  : 'text-theme-muted hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-theme-accent" />
              <span>Review</span>
            </button>

            <button
              onClick={() => setActiveTab('moves')}
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                activeTab === 'moves'
                  ? 'bg-theme-btn text-white shadow-xs'
                  : 'text-theme-muted hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-theme-accent" />
              <span>Moves</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                activeTab === 'graph'
                  ? 'bg-theme-btn text-white shadow-xs'
                  : 'text-theme-muted hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-theme-accent" />
              <span>Graph</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              title="Engine Depth & Analysis Settings"
              className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                activeTab === 'settings'
                  ? 'bg-theme-btn text-white shadow-xs'
                  : 'text-theme-muted hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-theme-accent" />
              <span>Engine</span>
            </button>
          </div>

          {/* TAB 1: REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-3">
              {/* Review Start / Progress Card */}
              {!reviewData && !isAnalyzing && (
                <div className="p-4 bg-theme-panel rounded-sm border border-theme-border text-center space-y-3 shadow-xs">
                  <button
                    onClick={handleStartReview}
                    disabled={moves.length === 0}
                    className="w-full py-3 px-4 rounded-sm font-bold text-sm btn-chess-green flex items-center justify-center gap-2 shadow disabled:opacity-40"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>{isLineModified ? 'Review Exploratory Line' : 'Review Game'}</span>
                  </button>

                  {isLineModified && (
                    <button
                      onClick={handleRevertToOriginal}
                      className="w-full py-2 px-3 rounded-sm font-semibold text-xs btn-chess-secondary flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Original Moves</span>
                    </button>
                  )}
                  {moves.length === 0 && (
                    <p className="text-[11px] text-theme-muted">
                      Make moves or import a game to review
                    </p>
                  )}
                </div>
              )}

              {/* In Progress */}
              {isAnalyzing && (
                <div className="p-4 bg-theme-panel rounded-sm border border-theme-border text-center space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-theme-accent">
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Analyzing Game...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-1 text-theme-muted">
                    <span>
                      {analysisProgress?.san
                        ? `${analysisProgress.san} (${analysisProgress.current}/${analysisProgress.total})`
                        : `${analysisProgress?.current || 0}/${analysisProgress?.total || moves.length}`}
                    </span>
                    <span className="font-mono font-bold text-theme-accent">
                      {analysisProgress?.percent || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-theme-sub h-2 rounded-full overflow-hidden border border-theme-border">
                    <div
                      className="bg-theme-accent h-full transition-all duration-150"
                      style={{ width: `${analysisProgress?.percent || 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Chess.com Style Coach Dialogue Card (Reference Image 2) */}
              {currentClassifiedMove && (
                <div className="p-3.5 rounded-sm bg-theme-panel border border-theme-border shadow-xs space-y-3">
                  {/* Header Row: Classification Badge + SAN + Score Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {currentClassifiedMove.classification ? (
                        <ClassificationIcon
                          classification={currentClassifiedMove.classification}
                          size={28}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-theme-sub border border-theme-border flex items-center justify-center text-xs text-theme-muted">
                          <span className="inline-block w-2.5 h-2.5 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono font-bold text-base text-white">
                          {currentClassifiedMove.san}
                        </span>
                        {currentClassifiedMove.classification?.label ? (
                          <span className="text-xs font-semibold text-theme-sec">
                            is {currentClassifiedMove.classification.label.toLowerCase()}
                          </span>
                        ) : typeof currentClassifiedMove.classification === 'string' ? (
                          <span className="text-xs font-semibold text-theme-sec">
                            is {currentClassifiedMove.classification.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-theme-muted italic">
                            analyzing...
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-xs bg-theme-btn border border-theme-border text-theme-text">
                      {currentClassifiedMove.scoreDisplay || '...'}
                    </span>
                  </div>

                  {/* Body: Natural Language Tactical Explanation */}
                  <p className="text-xs text-theme-sec leading-relaxed">
                    {currentClassifiedMove.coachExplanation}
                  </p>

                  {/* Engine Best Line Suggestion */}
                  {currentClassifiedMove.bestMoveSan && (
                    <div className="text-[11px] text-theme-muted bg-theme-sub p-2 rounded-xs border border-theme-border font-mono flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-theme-muted">Best:</span>
                        <span className="font-bold text-theme-accent">{currentClassifiedMove.bestMoveSan}</span>
                      </div>
                      {(currentClassifiedMove.bestMovePv || currentClassifiedMove.currEval?.pv) && (
                        <span className="text-[10px] text-theme-muted truncate max-w-[200px]">
                          {(currentClassifiedMove.bestMovePv || currentClassifiedMove.currEval?.pv || '').split(' ').slice(0, 4).join(' ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons (Retry, Show Line, Next) */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-theme-border">
                    <button
                      onClick={handleRetryMove}
                      className="py-2 sm:py-1.5 px-2 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>

                    <button
                      onClick={handleToggleBestLine}
                      className={`py-2 sm:py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1 border transition-colors active:scale-95 cursor-pointer ${
                        showBestLine
                          ? 'bg-theme-accent text-white border-theme-accent'
                          : 'btn-chess-secondary'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showBestLine ? 'Hide Line' : 'Show Line'}</span>
                    </button>

                    <button
                      onClick={() => goToStep(Math.min(moves.length - 1, currentStep + 1))}
                      disabled={currentStep >= moves.length - 1}
                      className="py-2 sm:py-1.5 px-2 rounded-sm text-xs font-bold btn-chess-green flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Accuracy Summary & Classification Grid (ChessDream style) */}
              {reviewData && (
                <div className="p-3 bg-theme-panel rounded-sm border border-theme-border space-y-3">
                  <div className="flex items-center justify-between border-b border-theme-border pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-theme-accent">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Game Review Summary</span>
                    </div>
                  </div>

                  {/* Accuracy Cards */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-sm bg-theme-sub border border-theme-border">
                      <div className="text-[11px] font-medium text-theme-muted">White Accuracy</div>
                      <div className="text-xl font-bold font-mono text-white mt-0.5">
                        {reviewData.whiteAccuracy}%
                      </div>
                    </div>
                    <div className="p-2.5 rounded-sm bg-theme-sub border border-theme-border">
                      <div className="text-[11px] font-medium text-theme-muted">Black Accuracy</div>
                      <div className="text-xl font-bold font-mono text-white mt-0.5">
                        {reviewData.blackAccuracy}%
                      </div>
                    </div>
                  </div>

                  {/* Classification Breakdown Table */}
                  <div className="space-y-1 text-xs">
                    {Object.values(MOVE_CLASSIFICATIONS).map((cat) => {
                      const whiteCount = reviewData.stats.w[cat.id] || 0;
                      const blackCount = reviewData.stats.b[cat.id] || 0;
                      if (whiteCount === 0 && blackCount === 0) return null;

                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-1.5 rounded-sm bg-theme-sub border border-theme-border"
                        >
                          <div className="flex items-center gap-2.5">
                            <ClassificationIcon classification={cat} size={18} />
                            <span className="text-xs font-medium text-theme-sec">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-white font-bold">{whiteCount}</span>
                            <span className="text-theme-muted">|</span>
                            <span className="text-theme-sec">{blackCount}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Exploratory Line Action Buttons */}
                  {isLineModified && (
                    <div className="pt-2 border-t border-theme-border flex gap-2">
                      <button
                        onClick={handleStartReview}
                        disabled={isAnalyzing}
                        className="flex-1 py-2 px-3 rounded-sm font-semibold text-xs btn-chess-green flex items-center justify-center gap-1.5 shadow active:scale-95 cursor-pointer disabled:opacity-40"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        <span>Re-Analyze Line</span>
                      </button>
                      <button
                        onClick={handleRevertToOriginal}
                        className="py-2 px-3 rounded-sm font-semibold text-xs btn-chess-secondary flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Reset to original imported game"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Original</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MOVES TABLE */}
          {activeTab === 'moves' && (
            <div className="h-[260px] sm:h-[360px]">
              <MoveHistory
                moves={reviewData ? reviewData.classifiedMoves : moves}
                currentMoveIndex={currentStep}
                onSelectMove={goToStep}
                onFirst={() => goToStep(-1)}
                onPrev={() => goToStep(currentStep - 1)}
                onNext={() => goToStep(currentStep + 1)}
                onLast={() => goToStep(moves.length - 1)}
              />
            </div>
          )}

          {/* TAB 3: GRAPH VIEW */}
          {activeTab === 'graph' && (
            <div className="p-3 bg-theme-panel rounded-sm border border-theme-border space-y-3">
              <span className="text-xs font-bold text-theme-muted uppercase tracking-wider block">
                Advantage Graph
              </span>
              {reviewData ? (
                <AdvantageGraph
                  evaluations={reviewData.evaluations}
                  classifiedMoves={reviewData.classifiedMoves}
                  currentStep={currentStep}
                  onSelectStep={goToStep}
                />
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-theme-muted">
                  No review data yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENGINE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-3.5 sm:p-4 bg-theme-panel border border-theme-border rounded-sm space-y-4 shadow-xs">
              {/* Depth Selection Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-theme-sec flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-theme-accent" />
                    <span>Search Depth</span>
                  </label>
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-xs bg-theme-accent text-white">
                    Depth {engineDepth}
                  </span>
                </div>

                {/* Depth Slider */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min={MIN_ANALYSIS_DEPTH}
                    max={MAX_ANALYSIS_DEPTH}
                    step={1}
                    value={engineDepth}
                    onChange={(e) => handleDepthChange(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-theme-sub rounded-lg appearance-none cursor-pointer accent-theme-accent"
                  />
                  <div className="flex justify-between text-[10px] text-theme-muted font-mono px-0.5">
                    <span>10 (Min)</span>
                    <span className="text-theme-accent font-bold">16 (Default)</span>
                    <span>22 (Max)</span>
                  </div>
                </div>

                {/* Preset Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2">
                  {DEPTH_PRESETS.map((p) => {
                    const isSelected = engineDepth === p.depth;
                    return (
                      <button
                        key={p.depth}
                        onClick={() => handleDepthChange(p.depth)}
                        className={`p-2 rounded-xs border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-theme-accent/20 border-theme-accent text-white shadow-xs'
                            : 'bg-theme-sub hover:bg-theme-btn border-theme-border text-theme-sec hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs">{p.depth}</span>
                          {isSelected && <Check className="w-3 h-3 text-theme-accent" />}
                        </div>
                        <div className="text-[10px] font-semibold text-theme-text truncate">{p.name}</div>
                        <div className="text-[9px] text-theme-muted truncate">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset to Default Button */}
              {engineDepth !== DEFAULT_ANALYSIS_DEPTH && (
                <button
                  onClick={() => handleDepthChange(DEFAULT_ANALYSIS_DEPTH)}
                  className="w-full py-1.5 px-3 rounded-xs text-xs font-semibold bg-theme-sub hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Default (Depth 16)</span>
                </button>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep <= -1}
              className="flex-1 py-2.5 sm:py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep >= moves.length - 1}
              className="flex-1 py-2.5 sm:py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToStep(-1)}
              className="py-2.5 sm:py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center active:scale-95 cursor-pointer"
              title="Reset position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

