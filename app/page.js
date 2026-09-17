// Main Page - Unified Authentic Chess.com UI with customizable themes
'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PlayAI from '../components/PlayAI';
import AnalysisBoard from '../components/AnalysisBoard';
import PassAndPlay from '../components/PassAndPlay';
import GameImporter from '../components/GameImporter';
import ThemeSelector from '../components/ThemeSelector';
import { Monitor, Users, FileText, Sparkles, X } from 'lucide-react';
import {
  getSavedBoardTheme,
  getSavedSiteTheme,
  SITE_THEMES,
  getThemeCssVariables,
  applySiteThemeToDocument,
} from '../lib/themes';

export default function Home() {
  const [currentView, setCurrentView] = useState('ai');
  const [boardTheme, setBoardTheme] = useState('stone');
  const [siteTheme, setSiteTheme] = useState('stone');
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [analysisPayload, setAnalysisPayload] = useState({
    moves: [],
    fen: null,
    id: 'default',
  });

  useEffect(() => {
    const savedBoard = getSavedBoardTheme();
    if (savedBoard && savedBoard.id) setBoardTheme(savedBoard.id);

    const savedSite = getSavedSiteTheme();
    if (savedSite && savedSite.id) setSiteTheme(savedSite.id);
  }, []);

  const activeSiteTheme = SITE_THEMES.find((s) => s.id === siteTheme) || SITE_THEMES.find((s) => s.id === 'stone') || SITE_THEMES[0];

  // Dynamically update documentElement styles so all CSS variables cascade globally
  useEffect(() => {
    applySiteThemeToDocument(activeSiteTheme);
  }, [activeSiteTheme]);

  const handleSelectSiteTheme = (themeId) => {
    setSiteTheme(themeId);
    setBoardTheme(themeId);
  };

  const handleSelectBoardTheme = (themeId) => {
    setBoardTheme(themeId);
  };

  const handleOpenAnalysisWithGame = (moves, fen = null) => {
    setAnalysisPayload({
      moves,
      fen,
      id: `analysis_${Date.now()}`,
    });
    setCurrentView('analysis');
  };

  const themeVars = getThemeCssVariables(activeSiteTheme);

  const leftNavItems = [
    { id: 'ai', label: 'Play vs Computer', icon: Monitor },
    { id: 'analysis', label: 'Analysis & Review', icon: Sparkles },
    { id: '1v1', label: 'Pass & Play', icon: Users },
    { id: 'import', label: 'Import Game', icon: FileText },
  ];

  return (
    <div
      className="min-h-screen flex flex-col text-theme-text select-none transition-colors duration-300"
      style={{
        ...themeVars,
        backgroundColor: activeSiteTheme.bg,
      }}
    >
      {/* Top Navbar */}
      <Navbar
        onSelectView={setCurrentView}
        onOpenThemeModal={() => setThemeModalOpen(true)}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 transition-opacity cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col justify-between w-72 max-w-[85vw] h-full bg-theme-sidebar border-r border-theme-border p-5 z-10 animate-fadeIn">
            <div className="space-y-4">
              {/* Header with Brand & Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-theme-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-sm bg-theme-accent flex items-center justify-center">
                    <svg viewBox="0 0 45 45" className="w-5 h-5 fill-white">
                      <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" />
                    </svg>
                  </div>
                  <span className="font-extrabold text-base text-white">
                    Mutant<span className="text-theme-accent">Chess</span>
                  </span>
                </div>

                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-sm bg-theme-panel text-theme-muted hover:text-white border border-theme-border cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1.5 pt-1">
                {leftNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-sm text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-theme-panel text-theme-accent border border-theme-border'
                          : 'text-theme-sec hover:text-white hover:bg-theme-panel border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-theme-accent' : 'text-theme-muted'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-theme-border">
              {/* Footer */}
              <div className="text-[11px] text-theme-muted font-sans select-none px-1">
                <div className="font-semibold text-theme-text">MutantChess</div>
                <div>&copy; 2026 All rights reserved.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container with Desktop Left Sidebar */}
      <div className="flex-1 flex w-full max-w-[1440px] mx-auto px-2 sm:px-4">
        
        {/* Left Sidebar on Desktop */}
        <aside className="hidden lg:flex flex-col justify-between w-56 xl:w-60 shrink-0 py-5 pr-5 border-r border-theme-border select-none">
          <div className="space-y-2">
            {leftNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full px-4 py-3 rounded-sm text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-theme-panel text-theme-accent border border-theme-border'
                      : 'text-theme-sec hover:text-white hover:bg-theme-panel border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-theme-accent' : 'text-theme-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Footer Copyright */}
            <div className="text-[11px] text-theme-muted font-sans select-none px-1">
              <div className="font-semibold text-theme-text">MutantChess</div>
              <div>&copy; 2026 All rights reserved.</div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col justify-start w-full py-2 sm:py-4 pb-6 min-w-0">
          {currentView === 'ai' && (
            <PlayAI
              boardThemeId={boardTheme}
              onAnalyzeGame={handleOpenAnalysisWithGame}
            />
          )}

          {currentView === 'analysis' && (
            <AnalysisBoard
              key={analysisPayload.id}
              initialMoves={analysisPayload.moves}
              initialFen={analysisPayload.fen}
              boardThemeId={boardTheme}
            />
          )}

          {currentView === '1v1' && (
            <PassAndPlay
              boardThemeId={boardTheme}
              onAnalyzeGame={handleOpenAnalysisWithGame}
            />
          )}

          {currentView === 'import' && (
            <GameImporter
              onSelectGameForAnalysis={handleOpenAnalysisWithGame}
            />
          )}
        </main>
      </div>

      {/* Theme Modal */}
      <ThemeSelector
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentBoardTheme={boardTheme}
        currentSiteTheme={siteTheme}
        onSelectBoardTheme={handleSelectBoardTheme}
        onSelectSiteTheme={handleSelectSiteTheme}
      />
    </div>
  );
}
