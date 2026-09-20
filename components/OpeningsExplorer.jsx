// Professional Chess Openings Explorer
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import EvalBar from './EvalBar';
import { stockfishService } from '../lib/stockfishService';
import { ALL_OPENINGS, OPENING_CATEGORIES } from '../lib/openingsDatabase';
import {
  Search,
  BookOpen,
  RotateCcw,
  BarChart2,
  Bot,
  Copy,
  Check,
  X,
  ChevronRight,
  Compass,
  Minus,
  Plus,
} from 'lucide-react';

export default function OpeningsExplorer({
  onAnalyzeOpening,
  onPlayOpening,
  boardThemeId = 'glass',
}) {
  const defaultOpening = useMemo(() => {
    return (
      ALL_OPENINGS.find((o) => o.name.toLowerCase().includes('ruy lopez: morphy')) ||
      ALL_OPENINGS.find((o) => o.name.toLowerCase().includes('italian game')) ||
      ALL_OPENINGS[0]
    );
  }, []);

  const [selectedOpening, setSelectedOpening] = useState(defaultOpening);
  const [chess, setChess] = useState(() => new Chess(defaultOpening.fen));
  const [evalScore, setEvalScore] = useState({ cp: 20, mate: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFlipped, setIsFlipped] = useState(false);
  const [boardHeight, setBoardHeight] = useState(560);
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(60);

  // Evaluate opening position
  useEffect(() => {
    let active = true;
    const targetFen = selectedOpening?.fen || chess.fen();
    stockfishService.evaluatePosition({
      fen: targetFen,
      depth: 8,
      onUpdate: (res) => {
        if (active && res) {
          setEvalScore({ cp: res.cp, mate: res.mate });
        }
      },
    }).then((res) => {
      if (active && res) {
        setEvalScore({ cp: res.cp, mate: res.mate });
      }
    });
    return () => {
      active = false;
    };
  }, [selectedOpening?.fen]);

  // Client-safe board width
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

  // Switch active opening
  const handleSelectOpening = (opening) => {
    setSelectedOpening(opening);
    try {
      setChess(new Chess(opening.fen));
    } catch (e) {
      console.error('Error loading opening position:', e);
    }
  };

  // Filter openings
  const filteredOpenings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_OPENINGS.filter((op) => {
      if (selectedCategory !== 'all' && op.category !== selectedCategory) return false;
      if (q && !op.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const displayedList = useMemo(() => {
    return filteredOpenings.slice(0, displayLimit);
  }, [filteredOpenings, displayLimit]);

  const handleCopyFen = async () => {
    if (!selectedOpening?.fen) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedOpening.fen);
        setCopiedFen(true);
        setTimeout(() => setCopiedFen(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy FEN', e);
    }
  };

  const handleCopyPgn = async () => {
    if (!selectedOpening?.pgn) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedOpening.pgn);
        setCopiedPgn(true);
        setTimeout(() => setCopiedPgn(false), 2000);
      }
    } catch (e) {
      console.error('Failed to copy PGN', e);
    }
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-1 sm:px-3 py-1 sm:py-3 select-none animate-fadeIn">
      {/* Workbench Layout: Left Board + Right Openings Catalog */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-6 w-full">
        {/* Left Column: Board Area */}
        <div className="flex-1 flex flex-col items-center min-w-0 w-full">
          {/* Top Info Banner */}
          <div
            className="w-full mb-1.5 sm:mb-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 bg-theme-panel rounded-sm border border-theme-border flex items-center justify-between shadow-xs transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xs bg-theme-sub border border-theme-border flex items-center justify-center text-theme-accent shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="font-bold text-xs sm:text-sm text-theme-text truncate max-w-[200px] sm:max-w-[400px]">
                    {selectedOpening?.name || 'Standard Position'}
                  </h2>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-theme-btn text-theme-accent px-1.5 py-0.5 rounded-xs border border-theme-border">
                    {selectedOpening?.category || 'General'}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-theme-muted truncate max-w-[340px] font-mono mt-0.5">
                  {selectedOpening?.pgn ? selectedOpening.pgn : selectedOpening?.fen}
                </div>
              </div>
            </div>
          </div>

          {/* Chessboard View */}
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
              playerColor={null}
              isFlipped={isFlipped}
              themeId={boardThemeId}
              onBoardWidthChange={setBoardHeight}
              customBoardWidth={userBoardWidth}
            />
          </div>

          {/* Board Controls & Actions Toolbar */}
          <div
            className="w-full mt-1.5 sm:mt-2 bg-theme-panel rounded-sm border border-theme-border p-2 sm:p-3 shadow-xs space-y-2 transition-all"
            style={{ width: '100%', maxWidth: boardHeight ? `${boardHeight + 24}px` : '100%' }}
          >
            {/* Quick Controls: Flip & Sizing */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-2.5 py-1 rounded-xs btn-chess-secondary flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                  title="Flip board orientation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Flip View</span>
                </button>
                <div className="flex items-center gap-1 border-l border-theme-border pl-1.5 sm:pl-2">
                  <button
                    onClick={handleCopyFen}
                    title="Copy position FEN"
                    className="px-2 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-muted hover:text-white border border-theme-border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-sans active:scale-95"
                  >
                    {copiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFen ? 'Copied' : 'FEN'}</span>
                  </button>
                  {selectedOpening?.pgn && (
                    <button
                      onClick={handleCopyPgn}
                      title="Copy opening PGN moves"
                      className="px-2 py-1 rounded-xs bg-theme-sub hover:bg-theme-btn text-theme-muted hover:text-white border border-theme-border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-sans active:scale-95"
                    >
                      {copiedPgn ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPgn ? 'Copied' : 'PGN'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sizing Controls - hidden on mobile */}
              <div className="hidden sm:flex items-center gap-1 bg-theme-sub px-2 py-0.5 rounded-xs border border-theme-border">
                <span className="text-[11px] font-sans text-theme-muted font-semibold mr-0.5">Size:</span>
                <button
                  onClick={() => handleAdjustBoardWidth(-30)}
                  title="Decrease size"
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
                  title="Increase size"
                  className="p-1 rounded-xs hover:bg-theme-panel text-theme-muted hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-theme-border">
              <button
                onClick={() =>
                  onAnalyzeOpening &&
                  onAnalyzeOpening(selectedOpening?.moves || [], null, {
                    site: 'opening',
                    opening: selectedOpening.name,
                    eco: selectedOpening.eco,
                    pgn: selectedOpening.pgn,
                    white: { username: 'White' },
                    black: { username: 'Black' },
                  })
                }
                className="w-full py-2.5 sm:py-2 px-3 rounded-xs font-bold text-xs sm:text-sm btn-chess-green flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <BarChart2 className="w-4 h-4" />
                <span>Analyze</span>
              </button>

              <button
                onClick={() =>
                  onPlayOpening &&
                  onPlayOpening(
                    selectedOpening.fen,
                    selectedOpening.name,
                    selectedOpening?.moves || [],
                    selectedOpening?.pgn || ''
                  )
                }
                className="w-full py-2.5 sm:py-2 px-3 rounded-xs font-bold text-xs sm:text-sm btn-chess-secondary flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Bot className="w-4 h-4 text-theme-accent" />
                <span>Play vs bot</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Catalog Sidebar */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3">
          <div className="bg-theme-panel border border-theme-border rounded-sm p-3 sm:p-4 shadow-xs space-y-3">
            {/* Header: Clean, Simple, Informative */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xs bg-theme-sub border border-theme-border flex items-center justify-center text-theme-accent shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white leading-none truncate">
                    Openings Catalog
                  </h3>
                  <span className="text-[11px] text-theme-muted font-mono">
                    {filteredOpenings.length.toLocaleString()} variations
                  </span>
                </div>
              </div>

              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setDisplayLimit(60);
                  }}
                  className="text-[11px] font-semibold text-theme-accent hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Search Input: Streamlined & Modern */}
            <div className="flex items-center bg-theme-sub border border-theme-border rounded-xs px-2.5 py-1.5 focus-within:border-theme-accent transition-all">
              <Search className="w-3.5 h-3.5 text-theme-muted shrink-0 mr-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(60);
                }}
                placeholder="Search openings by name or move..."
                className="flex-1 bg-transparent border-0 p-0 text-xs text-white placeholder-theme-muted focus:outline-none min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDisplayLimit(60);
                  }}
                  className="text-theme-muted hover:text-white p-0.5 ml-1 shrink-0 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter: Clean Horizontal Pill Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              {OPENING_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setDisplayLimit(60);
                    }}
                    className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-theme-accent text-white font-bold'
                        : 'bg-theme-sub hover:bg-theme-btn text-theme-muted hover:text-white border border-theme-border'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Openings List: Clean, uncluttered, focused */}
            <div className="max-h-[480px] sm:max-h-[520px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {displayedList.length === 0 ? (
                <div className="text-center py-10 text-xs text-theme-muted">
                  No openings found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                displayedList.map((op) => {
                  const isSelected = selectedOpening?.id === op.id;
                  return (
                    <div
                      key={op.id}
                      onClick={() => handleSelectOpening(op)}
                      className={`group px-3 py-2.5 rounded-xs border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                        isSelected
                          ? 'bg-theme-btn border-theme-accent text-white border-l-[3px] border-l-theme-accent'
                          : 'bg-theme-sub hover:bg-theme-btn border-theme-border text-theme-sec hover:text-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`font-bold text-xs truncate transition-colors ${
                          isSelected ? 'text-white' : 'text-theme-text group-hover:text-white'
                        }`}>
                          {op.name}
                        </div>
                        {op.pgn && (
                          <div
                            className="text-[11px] font-mono text-theme-muted truncate mt-0.5"
                            title={op.pgn}
                          >
                            {op.pgn}
                          </div>
                        )}
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected
                            ? 'text-theme-accent translate-x-0.5'
                            : 'text-theme-muted opacity-40 group-hover:opacity-90'
                        }`}
                      />
                    </div>
                  );
                })
              )}

              {/* Load more button */}
              {displayedList.length < filteredOpenings.length && (
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 60)}
                  className="w-full py-2 rounded-xs text-xs font-bold bg-theme-sub hover:bg-theme-btn border border-theme-border text-theme-sec hover:text-white cursor-pointer transition-colors mt-1"
                >
                  Load More ({filteredOpenings.length - displayedList.length} remaining)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
