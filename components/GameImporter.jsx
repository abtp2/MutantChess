// Professional Chess.com style Game Importer
'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchChessComGames,
  fetchLichessGames,
  getSavedUsernames,
  parsePgn,
} from '../lib/gameImporter';
import {
  Search,
  History,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  DownloadCloud,
} from 'lucide-react';

export default function GameImporter({ onSelectGameForAnalysis }) {
  const [activeTab, setActiveTab] = useState('chesscom');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [savedUsers, setSavedUsers] = useState({ chessCom: [], lichess: [] });

  const [pgnInput, setPgnInput] = useState('');
  const [fenInput, setFenInput] = useState('');

  useEffect(() => {
    setSavedUsers(getSavedUsernames());
  }, []);

  const handleSearch = async (userToSearch) => {
    const targetUser = (userToSearch || username).trim();
    if (!targetUser) return;

    setLoading(true);
    setError('');
    setGames([]);

    try {
      if (activeTab === 'chesscom') {
        const fetched = await fetchChessComGames(targetUser);
        setGames(fetched);
      } else if (activeTab === 'lichess') {
        const fetched = await fetchLichessGames(targetUser);
        setGames(fetched);
      }
      setSavedUsers(getSavedUsernames());
    } catch (err) {
      setError(err.message || 'Failed to fetch games.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPgn = () => {
    if (!pgnInput.trim()) return;
    const parsed = parsePgn(pgnInput);
    if (parsed.success) {
      onSelectGameForAnalysis(parsed.moves);
    } else {
      setError(parsed.error || 'Failed to parse PGN.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        setPgnInput(text);
        const parsed = parsePgn(text);
        if (parsed.success) {
          onSelectGameForAnalysis(parsed.moves);
        } else {
          setError('Invalid PGN file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleLoadFen = () => {
    if (!fenInput.trim()) return;
    onSelectGameForAnalysis([], fenInput.trim());
  };

  const handleSelectGame = (game) => {
    if (game.pgn) {
      const parsed = parsePgn(game.pgn);
      if (parsed.success) {
        onSelectGameForAnalysis(parsed.moves);
      } else {
        setError('Failed to parse game PGN.');
      }
    }
  };

  const currentSaved = activeTab === 'chesscom' ? savedUsers.chessCom : savedUsers.lichess;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 select-none animate-fadeIn">
      
      {/* Header Card */}
      <div className="bg-theme-panel border border-theme-border rounded-sm p-5 shadow-lg mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-sm bg-theme-accent flex items-center justify-center text-white shadow">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-text">Import & Review Games</h2>
            <p className="text-xs text-theme-muted">
              Enter a Chess.com or Lichess username to review your recent games with Stockfish 18 WASM
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-theme-border">
          {[
            { id: 'chesscom', label: 'Chess.com' },
            { id: 'lichess', label: 'Lichess.org' },
            { id: 'pgn', label: 'Paste PGN' },
            { id: 'fen', label: 'Custom FEN' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setGames([]); setError(''); }}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-theme-accent text-white shadow-md'
                  : 'bg-theme-btn text-theme-sec hover:bg-theme-btnHover hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-theme-panel border border-theme-border rounded-sm p-5 shadow-lg">
        
        {error && (
          <div className="mb-4 p-3 rounded-sm bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Chess.com or Lichess Search */}
        {(activeTab === 'chesscom' || activeTab === 'lichess') && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  activeTab === 'chesscom'
                    ? "Enter Chess.com username (e.g. magnuscarlsen, hikaru)..."
                    : "Enter Lichess username (e.g. DrNykterstein, penguingm1)..."
                }
                className="flex-1 bg-theme-sub border border-theme-border rounded-sm px-3.5 py-2.5 text-xs sm:text-sm text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !username.trim()}
                className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch</span>
              </button>
            </div>

            {/* Saved Usernames from LocalStorage */}
            {currentSaved && currentSaved.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-theme-muted flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  <span>Recent:</span>
                </span>
                {currentSaved.map((user) => (
                  <button
                    key={user}
                    onClick={() => {
                      setUsername(user);
                      handleSearch(user);
                    }}
                    className="px-2.5 py-1 rounded-xs bg-theme-btn hover:bg-theme-btnHover text-xs font-mono text-theme-sec hover:text-white transition-colors"
                  >
                    {user}
                  </button>
                ))}
              </div>
            )}

            {/* Games Grid */}
            {games.length > 0 && (
              <div className="mt-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted">
                  Select a Game to Review ({games.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[440px] overflow-y-auto custom-scrollbar pr-1">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => handleSelectGame(g)}
                      className="p-3 rounded-sm bg-theme-sub hover:bg-theme-btnHover border border-theme-border hover:border-theme-accent cursor-pointer transition-all shadow-sm group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-theme-muted mb-1">
                        <span>{g.date}</span>
                        <span className="font-semibold">{g.timeControl}</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="text-theme-text truncate flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                          <span className="font-bold">{g.white.username}</span>
                          <span className="text-theme-muted">({g.white.rating})</span>
                        </div>
                        <div className="text-theme-text truncate flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600" />
                          <span className="font-bold">{g.black.username}</span>
                          <span className="text-theme-muted">({g.black.rating})</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-theme-border flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-xs ${
                            g.result === 'Win'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : g.result === 'Loss'
                              ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                              : 'bg-theme-btn text-theme-sec'
                          }`}
                        >
                          {g.result}
                        </span>

                        <div className="flex items-center gap-1 text-xs font-bold text-theme-accent group-hover:underline">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Review Game</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PGN Tab */}
        {activeTab === 'pgn' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
                Paste PGN Notation
              </label>
              <textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6..."
                rows={6}
                className="w-full bg-theme-sub border border-theme-border rounded-sm p-3 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="px-3.5 py-2 rounded-sm bg-theme-btn hover:bg-theme-btnHover text-xs font-semibold text-theme-sec hover:text-white cursor-pointer transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4 text-theme-accent" />
                <span>Upload .pgn File</span>
                <input
                  type="file"
                  accept=".pgn,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleLoadPgn}
                disabled={!pgnInput.trim()}
                className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>Review Game</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. FEN Tab */}
        {activeTab === 'fen' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
                Paste FEN String
              </label>
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                className="w-full bg-theme-sub border border-theme-border rounded-sm px-3.5 py-2.5 text-xs sm:text-sm font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-accent"
              />
            </div>

            <button
              onClick={handleLoadFen}
              disabled={!fenInput.trim()}
              className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40"
            >
              <span>Load in Analysis</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
