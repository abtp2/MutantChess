// Native Mobile App Bottom Navigation Bar for MutantChess
'use client';

import React from 'react';
import { Monitor, BarChart2, BookOpen, Users, FileText } from 'lucide-react';

export default function BottomNav({ currentView, onSelectView }) {
  const navItems = [
    { id: 'ai', label: 'Play', icon: Monitor },
    { id: 'analysis', label: 'Review', icon: BarChart2 },
    { id: 'openings', label: 'Openings', icon: BookOpen },
    { id: '1v1', label: '1v1', icon: Users },
    { id: 'import', label: 'Import', icon: FileText },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-theme-sidebar/95 backdrop-blur-md border-t border-theme-border shadow-[0_-4px_16px_rgba(0,0,0,0.35)] select-none transition-colors"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all duration-150 touch-manipulation cursor-pointer active:scale-90 ${
                isActive
                  ? 'text-theme-accent font-bold'
                  : 'text-theme-muted hover:text-theme-sec'
              }`}
            >
              {/* Active top bar indicator */}
              {isActive && (
                <span className="absolute -top-1.5 w-7 h-1 bg-theme-accent rounded-full shadow-[0_0_8px_var(--theme-accent)] animate-fadeIn" />
              )}

              <div
                className={`p-1 rounded-sm transition-colors ${
                  isActive ? 'bg-theme-panel text-theme-accent' : 'text-theme-muted'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <span
                className={`text-[10px] sm:text-[11px] leading-none tracking-tight ${
                  isActive ? 'font-black text-white' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
