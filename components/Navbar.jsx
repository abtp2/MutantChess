// Professional Chess.com style Navigation Bar
'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Settings, Menu, Github } from 'lucide-react';
import { getSoundEnabled, setSoundEnabled } from '../lib/audio';
import Logo from './Logo';

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
            className="lg:hidden p-2 rounded-sm bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border cursor-pointer transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand */}
          <div
            onClick={() => onSelectView && onSelectView('ai')}
            className="flex items-center cursor-pointer group py-1"
          >
            <Logo size="md" />
          </div>
        </div>

        {/* Right: GitHub profile, Sound toggler, Settings */}
        <div className="flex items-center gap-2">
          {/* GitHub Profile (@abtp2) */}
          <a
            href="https://github.com/abtp2"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub (@abtp2)"
            aria-label="GitHub Profile (@abtp2)"
            className="p-2 rounded-sm bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <Github className="w-4 h-4 text-theme-sec hover:text-white transition-colors" />
          </a>

          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
            className="p-2 rounded-sm bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-all cursor-pointer active:scale-95"
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
            className="p-2 rounded-sm bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border transition-all cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4 text-theme-accent" />
          </button>
        </div>
      </div>
    </header>
  );
}
