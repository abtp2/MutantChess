// Professional Chess.com style Navigation Bar
'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Settings, Bot, Sparkles, Users, DownloadCloud, Menu, X } from 'lucide-react';
import { getSoundEnabled, setSoundEnabled } from '../lib/audio';

export default function Navbar({
  onSelectView,
  onOpenThemeModal,
  onToggleMobileSidebar,
}) {
  const [soundOn, setSoundOn] = useState(getSoundEnabled());

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-theme-sidebar border-b border-theme-border select-none transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Left: Mobile Hamburger Menu & Brand */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Open Navigation Menu"
            className="lg:hidden p-2 rounded-lg bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border cursor-pointer transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand */}
          <div
            onClick={() => onSelectView && onSelectView('ai')}
            className="flex items-center gap-2.5 cursor-pointer group py-1"
          >
            {/* Chess Pawn Emblem */}
            <div className="w-8 h-8 rounded-lg bg-theme-accent flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 45 45" className="w-5 h-5 fill-white">
                <path d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z" />
              </svg>
            </div>

            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight text-white leading-none">
                Mutant<span className="text-theme-accent">Chess</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Only Settings and Volume icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
            className="p-2 rounded-lg bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-colors cursor-pointer"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-theme-accent" />
            ) : (
              <VolumeX className="w-4 h-4 text-theme-muted" />
            )}
          </button>

          <button
            onClick={onOpenThemeModal}
            title="Board & Site Themes"
            aria-label="Change Theme"
            className="p-2 rounded-lg bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-theme-accent" />
          </button>
        </div>
      </div>
    </header>
  );
}
