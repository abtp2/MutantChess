// Home / Lobby View directly styled after UI_reference.png
import React, { useState } from 'react';
import { Compass, Users, Bot, BarChart2, DownloadCloud, Share2, X, RefreshCw } from 'lucide-react';
import ChessBoard from './ChessBoard';
import { Chess } from 'chess.js';
import { BOTS } from '../lib/bots';

export default function HomeLobby({
  onSelectView,
  onStartBotMatch,
  boardThemeId = 'slate',
}) {
  // Mini interactive board state
  const [demoChess, setDemoChess] = useState(() => {
    const c = new Chess();
    // Play a few nice moves like in the reference image
    try {
      c.move('e4');
      c.move('e5');
      c.move('Nf3');
      c.move('Nc6');
      c.move('Bc4');
      c.move('Nf6');
      c.move('d3');
      c.move('Bc5');
    } catch (e) {}
    return c;
  });

  const [activeBotIndex, setActiveBotIndex] = useState(1); // Deadpool is index 1
  const [speechText, setSpeechText] = useState("OR start your own game instead.");

  const currentBot = BOTS[activeBotIndex] || BOTS[1];

  const handleDemoMove = ({ from, to, promotion }) => {
    try {
      const next = new Chess(demoChess.fen());
      const res = next.move({ from, to, promotion });
      if (res) {
        setDemoChess(next);
        setSpeechText("Nice move! Want to play for real?");
      }
    } catch (e) {}
  };

  const cycleBotQuote = () => {
    const nextIdx = (activeBotIndex + 1) % BOTS.length;
    setActiveBotIndex(nextIdx);
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      {/* Container Card matching UI_reference.png */}
      <div className="relative w-full max-w-5xl bg-[#181c24] border border-[#2a3140] rounded-sm p-5 sm:p-8 sm:pb-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md">
        
        {/* Floating Top Close/Restart Icon Button (matches UI reference) */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              setDemoChess(new Chess());
              setSpeechText("OR start your own game instead.");
            }}
            title="Reset preview board"
            className="w-10 h-10 rounded-full bg-[#1c212c] hover:bg-[#283040] border border-[#374154] flex items-center justify-center text-gray-300 hover:text-white shadow-xl transition-transform hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          
          {/* Left Column: Deadpool / Character Mascot leaning over Chessboard */}
          <div className="lg:col-span-6 flex flex-col items-center">
            
            {/* Speech Bubble */}
            <div className="relative mb-2 self-center sm:self-end sm:mr-16 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="bg-[#12151c] border border-[#2d3647] rounded-sm px-3.5 py-1.5 text-xs text-gray-200 font-medium shadow-lg max-w-xs text-center">
                {speechText}
              </div>
              {/* Bubble Arrow */}
              <div className="w-2.5 h-2.5 bg-[#12151c] border-r border-b border-[#2d3647] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            </div>

            {/* Character Mascot Image leaning over the board */}
            <div className="relative w-72 sm:w-88 h-28 -mb-3 z-10 flex items-end justify-center pointer-events-none">
              <img
                src="/deadpool.png"
                alt="Character leaning over chessboard"
                className="w-full h-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)] filter contrast-110"
              />
            </div>

            {/* Chess Board Container */}
            <div className="w-full max-w-[340px] sm:max-w-[380px] z-0">
              <ChessBoard
                chess={demoChess}
                onMove={handleDemoMove}
                themeId={boardThemeId}
                disabled={false}
              />
            </div>
            <span className="text-[11px] text-gray-500 mt-2 font-mono">
              Tip: You can drag or click pieces above for a warm up!
            </span>
          </div>

          {/* Right Column: Quotes and Action Buttons */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            
            {/* Stylized Quote matching UI reference */}
            <div
              onClick={cycleBotQuote}
              className="cursor-pointer group select-none transition-all"
              title="Click to cycle bot quotes"
            >
              <blockquote className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-wider text-gray-100 font-sans leading-snug drop-shadow-md group-hover:text-red-400 transition-colors">
                {currentBot.id === 'ashutosh_dev'
                  ? '"FIRST, SOLVE THE PROBLEM. THEN, WRITE THE CODE."'
                  : `"${(currentBot.quotes?.start?.[0] || 'Let\\'s play chess!').toUpperCase()}"`}
              </blockquote>
              <div className="text-right text-sm sm:text-base italic text-gray-400 font-serif mt-2">
                ~ {currentBot.name} {currentBot.title ? `(${currentBot.title})` : ''}
              </div>
            </div>

            {/* 2x2 Action Cards Grid (faithfully matches UI reference) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              
              {/* New Game */}
              <button
                onClick={() => onSelectView('ai')}
                className="flex items-center gap-3.5 px-5 py-4 rounded-sm bg-[#232936] hover:bg-[#2d3546] border border-[#333d50] hover:border-[#e63946]/50 transition-all text-left shadow-lg group hover:translate-y-[-2px]"
              >
                <div className="w-10 h-10 rounded-sm bg-[#181c26] flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform border border-[#333e52]">
                  <Compass className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-gray-100 group-hover:text-red-400 transition-colors">
                    New Game
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Quick match vs AI
                  </p>
                </div>
              </button>

              {/* 1 vs 1 */}
              <button
                onClick={() => onSelectView('1v1')}
                className="flex items-center gap-3.5 px-5 py-4 rounded-sm bg-[#232936] hover:bg-[#2d3546] border border-[#333d50] hover:border-blue-500/50 transition-all text-left shadow-lg group hover:translate-y-[-2px]"
              >
                <div className="w-10 h-10 rounded-sm bg-[#181c26] flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform border border-[#333e52]">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-gray-100 group-hover:text-blue-400 transition-colors">
                    1 vs 1
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Pass & Play locally
                  </p>
                </div>
              </button>

              {/* vs AI */}
              <button
                onClick={() => onSelectView('ai')}
                className="flex items-center gap-3.5 px-5 py-4 rounded-sm bg-[#232936] hover:bg-[#2d3546] border border-[#333d50] hover:border-emerald-500/50 transition-all text-left shadow-lg group hover:translate-y-[-2px]"
              >
                <div className="w-10 h-10 rounded-sm bg-[#181c26] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform border border-[#333e52]">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-gray-100 group-hover:text-emerald-400 transition-colors">
                    vs AI Bots
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Play against 5 custom bots
                  </p>
                </div>
              </button>

              {/* Analysis & Review */}
              <button
                onClick={() => onSelectView('analysis')}
                className="flex items-center gap-3.5 px-5 py-4 rounded-sm bg-[#232936] hover:bg-[#2d3546] border border-[#333d50] hover:border-purple-500/50 transition-all text-left shadow-lg group hover:translate-y-[-2px]"
              >
                <div className="w-10 h-10 rounded-sm bg-[#181c26] flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform border border-[#333e52]">
                  <BarChart2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-gray-100 group-hover:text-purple-400 transition-colors">
                    Analysis & Review
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Stockfish 18 WASM
                  </p>
                </div>
              </button>

            </div>

            {/* Extra Row: Import Games from Chess.com / Lichess */}
            <button
              onClick={() => onSelectView('import')}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-sm bg-[#1e2533] hover:bg-[#252c3c] border border-[#374357] text-gray-200 hover:text-white transition-all text-xs sm:text-sm font-semibold shadow-md group"
            >
              <DownloadCloud className="w-4 h-4 text-[#e63946] group-hover:scale-110 transition-transform" />
              <span>Import & Review from Chess.com or Lichess</span>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
