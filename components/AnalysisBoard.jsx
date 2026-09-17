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
  Sparkles,
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

export default function AnalysisBoard({
  initialMoves = [],
  initialFen = null,
  boardThemeId = 'stone',
}) {
  const [moves, setMoves] = useState(initialMoves);
  const [currentStep, setCurrentStep] = useState(() => (initialMoves && initialMoves.length > 0 ? initialMoves.length - 1 : -1));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [liveEval, setLiveEval] = useState({ cp: 0, mate: null, depth: 0, bestMove: null, pv: '' });
  const [bestMoveArrow, setBestMoveArrow] = useState(null);
  const [showBestLine, setShowBestLine] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [boardHeight, setBoardHeight] = useState(480);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'moves' | 'graph'
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [userBoardWidth, setUserBoardWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mutantchess_board_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 720) return parsed;
      }
    }
    return null;
  });

  const handleAdjustBoardWidth = (delta) => {
    const current = userBoardWidth || boardHeight || 540;
    const nextWidth = Math.max(340, Math.min(680, current + delta));
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
      }, 16); // Deep tactical depth 16 for grandmaster-level comprehension

      setReviewData(results);
      if (results && (results.stats.w.brilliant > 0 || results.stats.b.brilliant > 0)) {
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

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-5 select-none animate-fadeIn">
      
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start justify-center">
        
        {/* Left Column: Board Area */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center w-full">
          
          {/* Top Player (Black) Card */}
          <div className="w-full max-w-[680px] mb-2 px-3 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-sm bg-theme-btn border border-theme-border flex items-center justify-center font-bold text-xs text-white">
                {isFlipped ? 'W' : 'B'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-theme-text">
                    {isFlipped ? 'White Player' : 'Black Player'}
                  </span>
                  {reviewData && (
                    <span className="text-[11px] font-mono font-bold bg-theme-btn text-theme-accent px-2 py-0.5 rounded-xs border border-theme-border flex items-center gap-1.5">
                      <span>{isFlipped ? `${reviewData.whiteAccuracy}%` : `${reviewData.blackAccuracy}%`}</span>
                      {(isFlipped ? reviewData.whiteEstimatedElo : reviewData.blackEstimatedElo) && (
                        <span className="text-theme-muted font-normal">
                          · ~{isFlipped ? reviewData.whiteEstimatedElo : reviewData.blackEstimatedElo} Elo
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-theme-muted">
                  {reviewData ? 'Grandmaster Accuracy' : 'Evaluation Position'}
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-theme-muted bg-theme-sub px-2.5 py-1 rounded-xs border border-theme-border">
              {currentStep >= 0 ? `Move ${Math.floor(currentStep / 2) + 1}` : 'Start'}
            </div>
          </div>

          {/* Board with Eval Bar Row */}
          <div className="w-full max-w-[680px] flex gap-2 sm:gap-3 items-stretch justify-center">
            <EvalBar
              cp={liveEval.cp}
              mate={liveEval.mate}
              isFlipped={isFlipped}
              height={boardHeight}
            />

            <div className="flex-1 flex justify-center min-w-0">
              <ChessBoard
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
          </div>

          {/* Bottom Player (White) Card */}
          <div className="w-full max-w-[680px] mt-2 px-3 py-2 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-sm bg-[#ffffff] border border-gray-300 flex items-center justify-center font-bold text-xs text-gray-900 shadow-xs">
                {isFlipped ? 'B' : 'W'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-theme-text">
                    {isFlipped ? 'Black Player' : 'White Player'}
                  </span>
                  {reviewData && (
                    <span className="text-[11px] font-mono font-bold bg-theme-btn text-theme-accent px-2 py-0.5 rounded-xs border border-theme-border flex items-center gap-1.5">
                      <span>{isFlipped ? `${reviewData.blackAccuracy}%` : `${reviewData.whiteAccuracy}%`}</span>
                      {(isFlipped ? reviewData.blackEstimatedElo : reviewData.whiteEstimatedElo) && (
                        <span className="text-theme-muted font-normal">
                          · ~{isFlipped ? reviewData.blackEstimatedElo : reviewData.whiteEstimatedElo} Elo
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-theme-muted">
                  {reviewData ? 'Grandmaster Accuracy' : 'Evaluation Position'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-theme-sub px-1.5 py-1 rounded-xs border border-theme-border text-xs">
                <button
                  onClick={() => handleAdjustBoardWidth(-30)}
                  title="Decrease board size"
                  className="p-1 rounded-xs hover:bg-theme-btn text-theme-sec hover:text-white transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={handleResetBoardWidth}
                  title="Fit to screen (Auto)"
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs transition-colors ${
                    userBoardWidth === null ? 'bg-theme-btn text-theme-accent font-bold' : 'text-theme-muted hover:text-white'
                  }`}
                >
                  {userBoardWidth ? `${userBoardWidth}px` : 'Auto'}
                </button>
                <button
                  onClick={() => handleAdjustBoardWidth(30)}
                  title="Increase board size"
                  className="p-1 rounded-xs hover:bg-theme-btn text-theme-sec hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => setIsFlipped(!isFlipped)}
                title="Flip board view"
                className="p-1.5 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-theme-sec hover:text-white border border-theme-border transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Engine Info Pill */}
          <div className="w-full max-w-[680px] mt-2 px-3 py-1.5 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between text-xs font-mono shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-theme-muted">Eval:</span>
              <span className="font-bold text-theme-text">
                {liveEval.mate !== null
                  ? `M${Math.abs(liveEval.mate)}`
                  : `${(liveEval.cp / 100).toFixed(2)}`}
              </span>
              <span className="text-theme-border">|</span>
              <span className="text-theme-muted">Depth:</span>
              <span className="text-theme-sec">{liveEval.depth || 10}</span>
            </div>

            {liveEval.bestMove && (
              <div className="flex items-center gap-1.5">
                <span className="text-theme-muted">Engine Best:</span>
                <span className="font-bold text-theme-accent bg-theme-sub border border-theme-border px-1.5 py-0.5 rounded-xs">
                  {liveEval.bestMove}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Review Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 w-full">
          
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
                <div className="p-4 bg-theme-panel rounded-sm border border-theme-border text-center space-y-2.5 shadow-xs">
                  <button
                    onClick={handleStartReview}
                    disabled={moves.length === 0}
                    className="w-full py-3 px-4 rounded-sm font-bold text-sm btn-chess-green flex items-center justify-center gap-2 shadow disabled:opacity-40"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Deep Game Review</span>
                  </button>
                  <p className="text-[11px] text-theme-muted">
                    {moves.length > 0
                      ? `Analyze all ${moves.length} moves at grandmaster Depth 16 with Stockfish 18`
                      : 'Make moves on the board or import a game to run analysis'}
                  </p>
                </div>
              )}

              {/* In Progress */}
              {isAnalyzing && (
                <div className="p-4 bg-theme-panel rounded-sm border border-theme-border text-center space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-theme-accent">
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Deep Tactical Game Review in Progress</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-1 text-theme-muted">
                    <span>
                      {analysisProgress?.san
                        ? `Evaluating ${analysisProgress.san} (${analysisProgress.current} of ${analysisProgress.total})`
                        : `Evaluating position ${analysisProgress?.current || 1} of ${analysisProgress?.total || moves.length}`}
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
                  <div className="text-[10px] text-theme-muted font-mono">
                    Stockfish 18 WASM &bull; Multi-PV 3 &bull; Depth 16 &bull; Grandmaster CAPS2
                  </div>
                </div>
              )}

              {/* Chess.com Style Coach Dialogue Card (Reference Image 2) */}
              {currentClassifiedMove && (
                <div className="p-3.5 rounded-sm bg-theme-panel border border-theme-border shadow-xs space-y-3">
                  {/* Header Row: Coach Avatar + Move Badge + Score Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-sm bg-theme-sub border border-theme-border flex items-center justify-center font-bold text-xs text-theme-accent shrink-0">
                        COACH
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-xs font-black font-mono"
                          style={{
                            backgroundColor: currentClassifiedMove.classification.bg,
                            color: currentClassifiedMove.classification.color,
                            border: `1px solid ${currentClassifiedMove.classification.color}50`,
                          }}
                        >
                          {currentClassifiedMove.classification.symbol} {currentClassifiedMove.san} is {currentClassifiedMove.classification.label.toLowerCase()}
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
                    <span className="text-[10px] font-mono text-theme-muted">Stockfish 18 Multi-PV</span>
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
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-1.5 py-0.2 rounded-xs font-black font-mono"
                              style={{ backgroundColor: cat.bg, color: cat.color }}
                            >
                              {cat.symbol}
                            </span>
                            <span className="text-[11px] text-theme-sec">{cat.label}</span>
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
                Advantage Waveform
              </span>
              {reviewData ? (
                <AdvantageGraph
                  evaluations={reviewData.evaluations}
                  classifiedMoves={reviewData.classifiedMoves}
                  currentStep={currentStep}
                  onSelectStep={goToStep}
                />
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-theme-muted italic">
                  Run Game Review to generate full advantage curve.
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
              className="py-2.5 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy current position FEN"
            >
              {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-theme-muted" />}
              <span>{copiedFen ? 'FEN Copied!' : 'Copy FEN'}</span>
            </button>
            <button
              onClick={handleCopyPgn}
              className="py-2.5 px-3 rounded-sm text-xs font-semibold btn-chess-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

