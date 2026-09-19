// Authentic Chess.com style Deep Tactical Analysis & Game Review
'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import EvalBar from './EvalBar';
import MoveHistory from './MoveHistory';
import AdvantageGraph from './AdvantageGraph';
import { MOVE_CLASSIFICATIONS, analyzeFullGame } from '../lib/analysisEngine.js';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

import CapturedPieces from './CapturedPieces';
import ClassificationIcon from './ClassificationIcon';
import { fetchPlayerAvatar } from '../lib/gameImporter';

export default function AnalysisBoard({
  initialMoves = [],
  initialFen = null,
  initialGameInfo = null,
  boardThemeId = 'stone',
  onOpenImporter,
}) {
  const [gameInfo, setGameInfo] = useState(initialGameInfo);
  const [moves, setMoves] = useState(initialMoves);
  const [currentStep, setCurrentStep] = useState(() => (initialMoves && initialMoves.length > 0 ? initialMoves.length - 1 : -1));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [liveEval, setLiveEval] = useState({ cp: 0, mate: null, depth: 0, bestMove: null, pv: '' });
  const [bestMoveArrow, setBestMoveArrow] = useState(null);

  useEffect(() => {
    setGameInfo(initialGameInfo);
  }, [initialGameInfo]);

  // Fetch missing avatars for players if imported
  useEffect(() => {
    if (!gameInfo) return;

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
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'moves' | 'graph'
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
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

  // Evaluate current position live with Stockfish
  useEffect(() => {
    let active = true;
    const currentFen = fensHistory[currentStep + 1] || fensHistory[0];

    if (reviewData && reviewData.evaluations[currentStep + 1]) {
      const ev = reviewData.evaluations[currentStep + 1];
      setLiveEval(ev);
      if (showBestLine && ev.bestMove && ev.bestMove.length >= 4) {
        setBestMoveArrow({
          from: ev.bestMove.substring(0, 2),
          to: ev.bestMove.substring(2, 4),
          color: '#81b64c',
        });
      } else {
        setBestMoveArrow(null);
      }
      return;
    }

    stockfishService.evaluatePosition({ fen: currentFen, depth: 10 }).then((res) => {
      if (!active || !res) return;
      setLiveEval(res);
      if (showBestLine && res.bestMove && res.bestMove.length >= 4) {
        setBestMoveArrow({
          from: res.bestMove.substring(0, 2),
          to: res.bestMove.substring(2, 4),
          color: '#81b64c',
        });
      } else {
        setBestMoveArrow(null);
      }
    });

    return () => {
      active = false;
    };
  }, [currentStep, fensHistory, reviewData, showBestLine]);

  const goToStep = (stepIndex) => {
    const clamped = Math.max(-1, Math.min(moves.length - 1, stepIndex));
    setCurrentStep(clamped);

    const targetFen = fensHistory[clamped + 1] || fensHistory[0];
    setChess(new Chess(targetFen));
  };

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
    try {
      const next = new Chess(chess.fen());
      const res = next.move({ from, to, promotion });
      if (!res) return false;

      const newMoves = [...moves.slice(0, currentStep + 1), res];
      setMoves(newMoves);
      setCurrentStep(newMoves.length - 1);
      setChess(next);
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

    try {
      const results = await analyzeFullGame(moves, (prog) => {
        setAnalysisProgress(prog);
      }, 12);

      setReviewData(results);
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

  const currentClassifiedMove = reviewData && currentStep >= 0 ? reviewData.classifiedMoves[currentStep] : null;
  const currentAnnotation = currentClassifiedMove
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

  const topPlayer = isFlipped
    ? {
        name: gameInfo?.white?.username || 'White',
        rating: gameInfo?.white?.rating,
        avatar: gameInfo?.white?.avatar,
        accuracy: reviewData?.whiteAccuracy,
        color: 'w',
        captured: capturedPieces.capturedByWhite,
      }
    : {
        name: gameInfo?.black?.username || 'Black',
        rating: gameInfo?.black?.rating,
        avatar: gameInfo?.black?.avatar,
        accuracy: reviewData?.blackAccuracy,
        color: 'b',
        captured: capturedPieces.capturedByBlack,
      };

  const bottomPlayer = isFlipped
    ? {
        name: gameInfo?.black?.username || 'Black',
        rating: gameInfo?.black?.rating,
        avatar: gameInfo?.black?.avatar,
        accuracy: reviewData?.blackAccuracy,
        color: 'b',
        captured: capturedPieces.capturedByBlack,
      }
    : {
        name: gameInfo?.white?.username || 'White',
        rating: gameInfo?.white?.rating,
        avatar: gameInfo?.white?.avatar,
        accuracy: reviewData?.whiteAccuracy,
        color: 'w',
        captured: capturedPieces.capturedByWhite,
      };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-1 sm:px-3 py-1 sm:py-3 select-none animate-fadeIn">
      
      {/* Responsive Layout: Board Area + Sidebar */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6 w-full">
        
        {/* Left Column: Board Area - Takes maximum remaining space */}
        <div className="flex-1 flex flex-col items-center min-w-0 w-full">
          
          {/* Top Player Card */}
          <div 
            className="w-full mb-2 px-3.5 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {topPlayer.avatar ? (
                <img
                  src={topPlayer.avatar}
                  alt={topPlayer.name}
                  className="w-10 h-10 rounded-sm border border-theme-border object-cover shrink-0 shadow-xs"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                    topPlayer.color === 'w'
                      ? 'bg-white text-gray-900 border border-gray-300'
                      : 'bg-theme-btn text-white border border-theme-border'
                  }`}
                >
                  {topPlayer.color === 'w' ? 'W' : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-theme-text truncate max-w-[150px] sm:max-w-[220px]">
                    {topPlayer.name}
                  </span>
                  {topPlayer.rating && (
                    <span className="text-xs font-mono font-medium text-theme-muted">
                      ({topPlayer.rating})
                    </span>
                  )}
                  {topPlayer.accuracy !== undefined && (
                    <span className="text-[11px] font-mono font-bold bg-theme-btn text-theme-accent px-2 py-0.5 rounded-xs border border-theme-border">
                      {topPlayer.accuracy}%
                    </span>
                  )}
                </div>
                <CapturedPieces
                  captured={topPlayer.captured}
                  playerColor={topPlayer.color}
                />
              </div>
            </div>
          </div>

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
                currentStep >= 0 && moves[currentStep]
                  ? { from: moves[currentStep].from, to: moves[currentStep].to }
                  : null
              }
            />
          </div>

          {/* Bottom Player Card */}
          <div 
            className="w-full mt-2 px-3.5 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {bottomPlayer.avatar ? (
                <img
                  src={bottomPlayer.avatar}
                  alt={bottomPlayer.name}
                  className="w-10 h-10 rounded-sm border border-theme-border object-cover shrink-0 shadow-xs"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-sm flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                    bottomPlayer.color === 'w'
                      ? 'bg-white text-gray-900 border border-gray-300'
                      : 'bg-theme-btn text-white border border-theme-border'
                  }`}
                >
                  {bottomPlayer.color === 'w' ? 'W' : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-theme-text truncate max-w-[150px] sm:max-w-[220px]">
                    {bottomPlayer.name}
                  </span>
                  {bottomPlayer.rating && (
                    <span className="text-xs font-mono font-medium text-theme-muted">
                      ({bottomPlayer.rating})
                    </span>
                  )}
                  {bottomPlayer.accuracy !== undefined && (
                    <span className="text-[11px] font-mono font-bold bg-theme-btn text-theme-accent px-2 py-0.5 rounded-xs border border-theme-border">
                      {bottomPlayer.accuracy}%
                    </span>
                  )}
                </div>
                <CapturedPieces
                  captured={bottomPlayer.captured}
                  playerColor={bottomPlayer.color}
                />
              </div>
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
                {currentStep >= 0 ? `Move ${Math.floor(currentStep / 2) + 1}` : 'Start Position'}
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

        {/* Right Column: Review Sidebar */}
        <div className="w-full lg:w-[360px] xl:w-[390px] shrink-0 flex flex-col gap-3">
          
          {/* Tabs Navigation (ChessDream style) */}
          <div className="flex bg-theme-panel border border-theme-border rounded-sm p-1 gap-1">
            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors ${
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors ${
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-sm flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'graph'
                  ? 'bg-theme-btn text-white shadow-xs'
                  : 'text-theme-muted hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-theme-accent" />
              <span>Graph</span>
            </button>
          </div>

          {/* Interactive Advantage Graph Strip */}
          {reviewData && (
            <AdvantageGraph
              evaluations={reviewData.evaluations}
              classifiedMoves={reviewData.classifiedMoves}
              currentStep={currentStep}
              onSelectStep={goToStep}
            />
          )}

          {/* TAB 1: REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-3">
              {/* Review Start / Progress Card */}
              {!reviewData && !isAnalyzing && (
                <div className="p-4 bg-theme-panel rounded-sm border border-theme-border text-center space-y-2 shadow-xs">
                  <button
                    onClick={handleStartReview}
                    disabled={moves.length === 0}
                    className="w-full py-3 px-4 rounded-sm font-bold text-sm btn-chess-green flex items-center justify-center gap-2 shadow disabled:opacity-40"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>Review Game</span>
                  </button>
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
                      <ClassificationIcon
                        classification={currentClassifiedMove.classification}
                        size={28}
                      />
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono font-bold text-base text-white">
                          {currentClassifiedMove.san}
                        </span>
                        <span className="text-xs font-semibold text-theme-sec">
                          is {currentClassifiedMove.classification.label.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-xs bg-theme-btn border border-theme-border text-theme-text">
                      {currentClassifiedMove.scoreDisplay}
                    </span>
                  </div>

                  {/* Body: Natural Language Tactical Explanation */}
                  <p className="text-xs text-theme-sec leading-relaxed">
                    {currentClassifiedMove.coachExplanation}
                  </p>

                  {/* Engine Best Line Suggestion */}
                  {currentClassifiedMove.bestMoveSan && (
                    <div className="text-[11px] text-theme-muted bg-theme-sub p-2 rounded-xs border border-theme-border font-mono flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span>Best:</span>
                        <span className="font-bold text-theme-accent">{currentClassifiedMove.bestMoveSan}</span>
                      </div>
                      {currentClassifiedMove.currEval?.pv && (
                        <span className="text-[10px] text-theme-muted truncate max-w-[200px]">
                          {currentClassifiedMove.currEval.pv.split(' ').slice(0, 4).join(' ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons (Retry, Show Line, Next) */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-theme-border">
                    <button
                      onClick={handleRetryMove}
                      className="py-1.5 px-2 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>

                    <button
                      onClick={() => setShowBestLine(!showBestLine)}
                      className={`py-1.5 px-2 rounded-sm text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                        showBestLine
                          ? 'bg-theme-accent text-white border-theme-accent'
                          : 'btn-chess-secondary'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Line</span>
                    </button>

                    <button
                      onClick={() => goToStep(Math.min(moves.length - 1, currentStep + 1))}
                      disabled={currentStep >= moves.length - 1}
                      className="py-1.5 px-2 rounded-sm text-xs font-bold btn-chess-green flex items-center justify-center gap-1 disabled:opacity-40"
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

                  {/* Accuracy & Estimated Performance Elo Cards */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-sm bg-theme-sub border border-theme-border">
                      <div className="text-[11px] font-medium text-theme-muted">White Accuracy</div>
                      <div className="text-xl font-bold font-mono text-white mt-0.5">
                        {reviewData.whiteAccuracy}%
                      </div>
                      {reviewData.whiteEstimatedElo && (
                        <div className="text-[11px] font-mono text-theme-accent font-semibold mt-0.5">
                          ~{reviewData.whiteEstimatedElo} Elo
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-sm bg-theme-sub border border-theme-border">
                      <div className="text-[11px] font-medium text-theme-muted">Black Accuracy</div>
                      <div className="text-xl font-bold font-mono text-white mt-0.5">
                        {reviewData.blackAccuracy}%
                      </div>
                      {reviewData.blackEstimatedElo && (
                        <div className="text-[11px] font-mono text-theme-accent font-semibold mt-0.5">
                          ~{reviewData.blackEstimatedElo} Elo
                        </div>
                      )}
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
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MOVES TABLE */}
          {activeTab === 'moves' && (
            <div className="h-[360px]">
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

          {/* Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep <= -1}
              className="flex-1 py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep >= moves.length - 1}
              className="flex-1 py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToStep(-1)}
              className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center"
              title="Reset position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy FEN & PGN Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopyFen}
              className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-utility flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy current position FEN"
            >
              {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
              <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
            </button>
            <button
              onClick={handleCopyPgn}
              className="py-2 px-3 rounded-sm text-xs font-semibold btn-chess-utility flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy game PGN"
            >
              {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
              <span>{copiedPgn ? 'PGN Copied!' : 'Copy PGN'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

