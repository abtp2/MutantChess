// Professional Theme Selector Modal for MutantChess
// Exactly 10 themes: Green, Wood, Icy Sea, Brown, Stone, Purple, Dark Blue, Newspaper, Glass, Tournament
'use client';

import React, { useState } from 'react';
import {
  BOARD_THEMES,
  SITE_THEMES,
  saveBoardTheme,
  saveSiteTheme,
} from '../lib/themes';
import { Palette, Check, Layout, Grid, X } from 'lucide-react';

export default function ThemeSelector({
  isOpen,
  onClose,
  currentBoardTheme,
  currentSiteTheme,
  onSelectBoardTheme,
  onSelectSiteTheme,
}) {
  const [activeTab, setActiveTab] = useState('app'); // Default to 'app'

  if (!isOpen) return null;

  const handleChooseAppTheme = (themeId) => {
    // Changing app theme also changes board theme to match
    onSelectSiteTheme(themeId);
    saveSiteTheme(themeId);
    onSelectBoardTheme(themeId);
    saveBoardTheme(themeId);
  };

  const handleChooseBoardTheme = (themeId) => {
    // Changing board theme changes ONLY the board theme
    onSelectBoardTheme(themeId);
    saveBoardTheme(themeId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-theme-panel border border-theme-border rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
        
        {/* Header */}
        <div className="px-4 py-3 bg-theme-sidebar border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-theme-accent" />
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
              Theme Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-white p-1 rounded hover:bg-theme-btn transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-theme-border bg-theme-sidebar px-4 pt-1.5 gap-2">
          <button
            onClick={() => setActiveTab('app')}
            className={`px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'app'
                ? 'border-theme-accent text-white'
                : 'border-transparent text-theme-muted hover:text-white'
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-theme-accent" />
            <span>App Theme ({SITE_THEMES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
              activeTab === 'board'
                ? 'border-theme-accent text-white'
                : 'border-transparent text-theme-muted hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-theme-accent" />
            <span>Board Theme ({BOARD_THEMES.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 max-h-[62vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. App Themes */}
          {activeTab === 'app' && (
            <div>
              <p className="text-[11px] text-theme-muted mb-3">
                Selecting an app theme automatically sets the board theme to match. You can customize your board theme separately in the Board tab.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SITE_THEMES.map((st) => {
                  const isSelected = currentSiteTheme === st.id;
                  const matchingBoard = BOARD_THEMES.find((b) => b.id === st.id) || BOARD_THEMES[0];
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleChooseAppTheme(st.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-theme-sub border-theme-accent shadow-xs'
                          : 'bg-theme-sub border-theme-border hover:border-theme-borderLight'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Mini board swatch preview */}
                        <div className="w-8 h-8 rounded shrink-0 overflow-hidden grid grid-cols-2 grid-rows-2 border border-theme-border">
                          <div style={{ backgroundColor: matchingBoard.light }} />
                          <div style={{ backgroundColor: matchingBoard.dark }} />
                          <div style={{ backgroundColor: matchingBoard.dark }} />
                          <div style={{ backgroundColor: matchingBoard.light }} />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">{st.name}</div>
                          <div className="text-[10px] text-theme-muted flex items-center gap-1.5">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: st.accent }}
                            />
                            <span>Accent</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded bg-theme-accent flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Board Themes */}
          {activeTab === 'board' && (
            <div>
              <p className="text-[11px] text-theme-muted mb-3">
                Choose a board style independently without affecting your current app interface theme.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {BOARD_THEMES.map((theme) => {
                  const isSelected = currentBoardTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleChooseBoardTheme(theme.id)}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors flex flex-col items-center gap-2 text-center ${
                        isSelected
                          ? 'bg-theme-sub border-theme-accent shadow-xs'
                          : 'bg-theme-sub border-theme-border hover:border-theme-borderLight'
                      }`}
                    >
                      <div className="w-12 h-12 rounded overflow-hidden grid grid-cols-2 grid-rows-2 border border-theme-border">
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                      </div>

                      <div className="flex items-center justify-center gap-1 w-full">
                        <span className="text-[11px] font-bold text-white truncate">{theme.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-theme-accent shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-theme-sidebar border-t border-theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold btn-chess-green"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

