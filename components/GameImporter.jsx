// Professional Chess.com and Lichess Game & Profile Importer
'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchChessComGames,
  fetchChessComProfile,
  fetchLichessGames,
  fetchLichessProfile,
  getSavedUsernames,
  parsePgn,
} from '../lib/gameImporter';
import {
  Search,
  History,
  FileText,
  Loader2,
  AlertCircle,
  BarChart2,
  DownloadCloud,
  Zap,
  Flame,
  Clock,
  ExternalLink,
  User,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';

export default function GameImporter({ onSelectGameForAnalysis }) {
  const [activeTab, setActiveTab] = useState('chesscom');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [savedUsers, setSavedUsers] = useState({ chessCom: [], lichess: [] });

  // Pagination state
  const [paginationData, setPaginationData] = useState({
    archives: null,
    archiveIndex: null,
    monthGames: null,
    monthOffset: 0,
    oldestTimestamp: null,
    hasMore: false,
  });

  // Filter states
  const [filterResult, setFilterResult] = useState('all'); // 'all' | 'win' | 'loss' | 'draw'
  const [filterTime, setFilterTime] = useState('all'); // 'all' | 'bullet' | 'blitz' | 'rapid' | 'daily'
  const [filterColor, setFilterColor] = useState('all'); // 'all' | 'white' | 'black'
  const [searchOpponent, setSearchOpponent] = useState('');

  const [pgnInput, setPgnInput] = useState('');
  const [fenInput, setFenInput] = useState('');

  useEffect(() => {
    setSavedUsers(getSavedUsernames());
  }, []);

  const handleResetFilters = () => {
    setFilterResult('all');
    setFilterTime('all');
    setFilterColor('all');
    setSearchOpponent('');
  };

  const handleSearch = async (userToSearch) => {
    const targetUser = (userToSearch || username).trim();
    if (!targetUser) return;

    setLoading(true);
    setError('');
    setGames([]);
    setUserProfile(null);
    setPaginationData({
      archives: null,
      archiveIndex: null,
      monthGames: null,
      monthOffset: 0,
      oldestTimestamp: null,
      hasMore: false,
    });
    handleResetFilters();

    try {
      if (activeTab === 'chesscom') {
        const [profile, fetchedGames] = await Promise.allSettled([
          fetchChessComProfile(targetUser),
          fetchChessComGames(targetUser),
        ]);

        if (profile.status === 'fulfilled') {
          setUserProfile(profile.value);
        }
        if (fetchedGames.status === 'fulfilled') {
          const res = fetchedGames.value;
          const gameList = Array.isArray(res) ? res : res.games || [];
          setGames(gameList);
          setPaginationData({
            archives: res.archives || null,
            archiveIndex: res.archiveIndex ?? null,
            monthGames: res.monthGames || null,
            monthOffset: res.monthOffset || 0,
            oldestTimestamp: null,
            hasMore: res.hasMore ?? false,
          });
        } else {
          throw new Error(fetchedGames.reason?.message || 'Failed to fetch games.');
        }
      } else if (activeTab === 'lichess') {
        const [profile, fetchedGames] = await Promise.allSettled([
          fetchLichessProfile(targetUser),
          fetchLichessGames(targetUser),
        ]);

        if (profile.status === 'fulfilled') {
          setUserProfile(profile.value);
        }
        if (fetchedGames.status === 'fulfilled') {
          const res = fetchedGames.value;
          const gameList = Array.isArray(res) ? res : res.games || [];
          setGames(gameList);
          setPaginationData({
            archives: null,
            archiveIndex: null,
            monthGames: null,
            monthOffset: 0,
            oldestTimestamp: res.oldestTimestamp || null,
            hasMore: res.hasMore ?? false,
          });
        } else {
          throw new Error(fetchedGames.reason?.message || 'Failed to fetch games.');
        }
      }
      setSavedUsers(getSavedUsernames());
    } catch (err) {
      setError(err.message || 'Failed to fetch user data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !paginationData.hasMore) return;
    setLoadingMore(true);
    setError('');

    try {
      const cleanUser = (userProfile?.username || username).trim();
      if (activeTab === 'chesscom') {
        const res = await fetchChessComGames(cleanUser, {
          archives: paginationData.archives,
          archiveIndex: paginationData.archiveIndex,
          monthGames: paginationData.monthGames,
          monthOffset: paginationData.monthOffset,
          pageSize: 25,
        });
        setGames((prev) => [...prev, ...(res.games || [])]);
        setPaginationData({
          archives: res.archives,
          archiveIndex: res.archiveIndex,
          monthGames: res.monthGames,
          monthOffset: res.monthOffset,
          oldestTimestamp: null,
          hasMore: res.hasMore,
        });
      } else if (activeTab === 'lichess') {
        const res = await fetchLichessGames(cleanUser, {
          until: paginationData.oldestTimestamp,
          max: 25,
        });
        setGames((prev) => [...prev, ...(res.games || [])]);
        setPaginationData((prev) => ({
          ...prev,
          oldestTimestamp: res.oldestTimestamp,
          hasMore: res.hasMore,
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load more games.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadPgn = () => {
    if (!pgnInput.trim()) return;
    const parsed = parsePgn(pgnInput);
    if (parsed.success) {
      const gameInfo = {
        site: 'pgn',
        white: { username: parsed.headers?.white || 'White', rating: parsed.headers?.whiteElo || null },
        black: { username: parsed.headers?.black || 'Black', rating: parsed.headers?.blackElo || null },
        result: parsed.headers?.result || '*',
        score: parsed.headers?.result || '*',
        opening: parsed.headers?.opening || null,
        timeControl: parsed.headers?.timeControl || null,
      };
      onSelectGameForAnalysis(parsed.moves, null, gameInfo);
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
          const gameInfo = {
            site: 'pgn',
            white: { username: parsed.headers?.white || 'White', rating: parsed.headers?.whiteElo || null },
            black: { username: parsed.headers?.black || 'Black', rating: parsed.headers?.blackElo || null },
            result: parsed.headers?.result || '*',
            score: parsed.headers?.result || '*',
            opening: parsed.headers?.opening || null,
            timeControl: parsed.headers?.timeControl || null,
          };
          onSelectGameForAnalysis(parsed.moves, null, gameInfo);
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
        const whiteUser = game.white?.username || parsed.headers?.white || 'White';
        const blackUser = game.black?.username || parsed.headers?.black || 'Black';
        const whiteRating = game.white?.rating || parsed.headers?.whiteElo || null;
        const blackRating = game.black?.rating || parsed.headers?.blackElo || null;

        const isUserWhite = userProfile && userProfile.username.toLowerCase() === whiteUser.toLowerCase();
        const isUserBlack = userProfile && userProfile.username.toLowerCase() === blackUser.toLowerCase();

        const gameInfo = {
          site: activeTab,
          white: {
            username: whiteUser,
            rating: whiteRating,
            avatar: isUserWhite ? userProfile.avatar : null,
          },
          black: {
            username: blackUser,
            rating: blackRating,
            avatar: isUserBlack ? userProfile.avatar : null,
          },
          result: game.result || parsed.headers?.result || '*',
          score: game.score || parsed.headers?.result || '*',
          opening: parsed.headers?.opening || null,
          timeControl: game.timeControl || parsed.headers?.timeControl || null,
        };
        onSelectGameForAnalysis(parsed.moves, null, gameInfo);
      } else {
        setError('Failed to parse game PGN.');
      }
    }
  };

  // Filtered games logic
  const filteredGames = games.filter((g) => {
    if (filterResult !== 'all' && g.result?.toLowerCase() !== filterResult) return false;
    if (filterTime !== 'all') {
      const tc = (g.timeClass || g.timeControl || '').toLowerCase();
      if (!tc.includes(filterTime)) return false;
    }
    if (filterColor !== 'all' && g.userColor !== filterColor) return false;
    if (searchOpponent.trim()) {
      const q = searchOpponent.trim().toLowerCase();
      const opp = (g.opponent || '').toLowerCase();
      const w = (g.white?.username || '').toLowerCase();
      const b = (g.black?.username || '').toLowerCase();
      if (!opp.includes(q) && !w.includes(q) && !b.includes(q)) return false;
    }
    return true;
  });

  const isAnyFilterActive =
    filterResult !== 'all' ||
    filterTime !== 'all' ||
    filterColor !== 'all' ||
    searchOpponent.trim() !== '';

  const totalWins = filteredGames.filter((g) => g.result === 'Win').length;
  const totalLosses = filteredGames.filter((g) => g.result === 'Loss').length;
  const totalDraws = filteredGames.filter((g) => g.result === 'Draw').length;

  const currentSaved = activeTab === 'chesscom' ? savedUsers.chessCom : savedUsers.lichess;

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 select-none animate-fadeIn">
      {/* Header Card */}
      <div className="bg-theme-panel border border-theme-border rounded-sm p-4 sm:p-5 shadow-xs mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-sm bg-theme-accent flex items-center justify-center text-white shadow-xs shrink-0">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Import Games</h2>
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
              onClick={() => {
                setActiveTab(tab.id);
                setGames([]);
                setUserProfile(null);
                setError('');
                handleResetFilters();
              }}
              className={`px-3.5 py-1.5 rounded-sm text-xs font-bold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-theme-accent text-white shadow-xs'
                  : 'bg-theme-btn text-theme-sec hover:bg-theme-btnHover hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-theme-panel border border-theme-border rounded-sm p-4 sm:p-5 shadow-xs space-y-4">
        {error && (
          <div className="p-3 rounded-sm bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Chess.com / Lichess Search */}
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
                    ? 'Enter Chess.com username (e.g. hikaru, magnuscarlsen)...'
                    : 'Enter Lichess username (e.g. DrNykterstein, penguingm1)...'
                }
                className="flex-1 bg-theme-sub border border-theme-border rounded-sm px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-theme-muted focus:outline-none focus:border-theme-accent"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !username.trim()}
                className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Fetch</span>
              </button>
            </div>

            {/* Saved Recent Usernames */}
            {currentSaved && currentSaved.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
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
                    className="px-2 py-0.5 rounded-xs bg-theme-sub hover:bg-theme-btn border border-theme-border text-xs font-mono text-theme-sec hover:text-white transition-colors cursor-pointer"
                  >
                    {user}
                  </button>
                ))}
              </div>
            )}

            {/* Profile Card if Fetched */}
            {userProfile && (
              <div className="p-3.5 rounded-sm bg-theme-sub border border-theme-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3">
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.username}
                      className="w-12 h-12 rounded-full border-2 border-theme-accent object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-theme-btn border border-theme-border flex items-center justify-center font-bold text-sm text-theme-accent shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      {userProfile.title && (
                        <span className="bg-red-800 text-white text-[10px] font-black px-1.5 py-0.2 rounded-xs">
                          {userProfile.title}
                        </span>
                      )}
                      <span className="font-bold text-sm text-white">{userProfile.username}</span>
                      {userProfile.name && userProfile.name !== userProfile.username && (
                        <span className="text-xs text-theme-muted">({userProfile.name})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-theme-muted capitalize mt-0.5">
                      {userProfile.site === 'chesscom' ? 'Chess.com Player' : 'Lichess Player'}
                    </div>
                  </div>
                </div>

                {/* Rating Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {userProfile.ratings?.bullet && (
                    <div className="px-2.5 py-1 rounded-xs bg-theme-panel border border-theme-border flex items-center gap-1.5 text-xs font-mono">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-theme-muted text-[11px]">Bullet</span>
                      <span className="font-bold text-white">({userProfile.ratings.bullet})</span>
                    </div>
                  )}
                  {userProfile.ratings?.blitz && (
                    <div className="px-2.5 py-1 rounded-xs bg-theme-panel border border-theme-border flex items-center gap-1.5 text-xs font-mono">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-theme-muted text-[11px]">Blitz</span>
                      <span className="font-bold text-white">({userProfile.ratings.blitz})</span>
                    </div>
                  )}
                  {userProfile.ratings?.rapid && (
                    <div className="px-2.5 py-1 rounded-xs bg-theme-panel border border-theme-border flex items-center gap-1.5 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-theme-muted text-[11px]">Rapid</span>
                      <span className="font-bold text-white">({userProfile.ratings.rapid})</span>
                    </div>
                  )}
                  {userProfile.url && (
                    <a
                      href={userProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xs bg-theme-panel hover:bg-theme-btn border border-theme-border text-theme-muted hover:text-white transition-colors"
                      title="View profile on website"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Games Section */}
            {games.length > 0 && (
              <div className="mt-4 space-y-3">
                {/* Filter Toolbar */}
                <div className="p-3 rounded-sm bg-theme-sub border border-theme-border space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                    {/* Opponent Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchOpponent}
                        onChange={(e) => setSearchOpponent(e.target.value)}
                        placeholder="Filter by opponent username..."
                        className="w-full pl-8.5 pr-8 py-1.5 bg-theme-panel border border-theme-border rounded-xs text-xs text-white placeholder-theme-muted focus:outline-none focus:border-theme-accent"
                      />
                      {searchOpponent && (
                        <button
                          onClick={() => setSearchOpponent('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-white p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Reset Filters button if active */}
                    {isAnyFilterActive && (
                      <button
                        onClick={handleResetFilters}
                        className="px-2.5 py-1.5 rounded-xs bg-theme-panel hover:bg-theme-btn border border-theme-border text-xs text-theme-sec hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Chips */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {/* Result Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-theme-muted text-[11px] font-semibold mr-1">Result:</span>
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'win', label: 'Wins' },
                        { id: 'loss', label: 'Losses' },
                        { id: 'draw', label: 'Draws' },
                      ].map((opt) => {
                        const isActive = filterResult === opt.id;
                        let chipStyle = 'bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border';
                        if (isActive) {
                          if (opt.id === 'win') chipStyle = 'bg-emerald-600 text-white font-bold border border-emerald-500 shadow-xs';
                          else if (opt.id === 'loss') chipStyle = 'bg-rose-600 text-white font-bold border border-rose-500 shadow-xs';
                          else if (opt.id === 'draw') chipStyle = 'bg-sky-600 text-white font-bold border border-sky-500 shadow-xs';
                          else chipStyle = 'bg-theme-accent text-white font-bold border border-theme-accent shadow-xs';
                        } else {
                          if (opt.id === 'win') chipStyle = 'bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-400 border border-emerald-800/40';
                          else if (opt.id === 'loss') chipStyle = 'bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 border border-rose-800/40';
                          else if (opt.id === 'draw') chipStyle = 'bg-sky-950/30 hover:bg-sky-950/60 text-sky-400 border border-sky-800/40';
                        }
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setFilterResult(opt.id)}
                            className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer ${chipStyle}`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Control Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-theme-muted text-[11px] font-semibold mr-1">Speed:</span>
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'bullet', label: 'Bullet' },
                        { id: 'blitz', label: 'Blitz' },
                        { id: 'rapid', label: 'Rapid' },
                        { id: 'daily', label: 'Daily' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFilterTime(opt.id)}
                          className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer ${
                            filterTime === opt.id
                              ? 'bg-theme-accent text-white font-bold border border-theme-accent shadow-xs'
                              : 'bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Color Filter */}
                    <div className="flex items-center gap-1">
                      <span className="text-theme-muted text-[11px] font-semibold mr-1">Color:</span>
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'white', label: 'White' },
                        { id: 'black', label: 'Black' },
                      ].map((opt) => {
                        const isActive = filterColor === opt.id;
                        let chipStyle = 'bg-theme-panel hover:bg-theme-btn text-theme-sec hover:text-white border border-theme-border';
                        if (isActive) {
                          if (opt.id === 'white') chipStyle = 'bg-white text-gray-950 font-bold border border-white shadow-xs';
                          else if (opt.id === 'black') chipStyle = 'bg-[#181614] text-white font-bold border border-[#4a4742] shadow-xs';
                          else chipStyle = 'bg-theme-accent text-white font-bold border border-theme-accent shadow-xs';
                        }
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setFilterColor(opt.id)}
                            className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer ${chipStyle}`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Showing Count & Stats Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-theme-border/60 text-[11px] text-theme-muted">
                    <span>
                      Showing <strong className="text-white">{filteredGames.length}</strong> of{' '}
                      <strong className="text-white">{games.length}</strong> games
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-emerald-400 font-semibold">{totalWins}W</span>
                      <span className="text-red-400 font-semibold">{totalLosses}L</span>
                      <span className="text-blue-400 font-semibold">{totalDraws}D</span>
                    </div>
                  </div>
                </div>

                {/* Games Grid or Empty message */}
                {filteredGames.length === 0 ? (
                  <div className="p-8 text-center bg-theme-sub rounded-sm border border-theme-border text-theme-muted text-xs">
                    No games match your selected filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[440px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredGames.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handleSelectGame(g)}
                        className="p-3 rounded-sm bg-theme-sub hover:bg-theme-btn border border-theme-border hover:border-theme-accent cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="flex items-center justify-between text-[11px] text-theme-muted mb-1.5">
                          <span>{g.date}</span>
                          <span className="font-semibold text-theme-sec">{g.timeControl}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="text-white truncate flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                            <span className="font-bold">{g.white.username}</span>
                            {g.white.rating && (
                              <span className="text-theme-muted font-mono">({g.white.rating})</span>
                            )}
                          </div>
                          <div className="text-white truncate flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600 shadow-xs" />
                            <span className="font-bold">{g.black.username}</span>
                            {g.black.rating && (
                              <span className="text-theme-muted font-mono">({g.black.rating})</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-theme-border flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-xs ${
                              g.result === 'Win'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : g.result === 'Loss'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-theme-panel text-theme-sec'
                            }`}
                          >
                            {g.result} ({g.score || '*'})
                          </span>

                          <div className="flex items-center gap-1.5 text-xs font-bold bg-theme-accent hover:bg-theme-accentHover text-white px-2.5 py-1 rounded-xs transition-colors shadow-xs">
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Analyze</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Games Button */}
                {paginationData.hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 px-4 rounded-sm font-bold text-xs bg-theme-panel hover:bg-theme-btn border border-theme-border hover:border-theme-borderLight text-theme-sec hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-40"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
                        <span>Loading earlier games...</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4 text-theme-accent" />
                        <span>Load More Games</span>
                      </>
                    )}
                  </button>
                ) : (
                  games.length > 0 && (
                    <div className="text-center py-2 text-[11px] text-theme-muted font-mono">
                      All available games loaded
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* PGN Tab */}
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
                className="w-full bg-theme-sub border border-theme-border rounded-sm p-3 text-xs font-mono text-white placeholder-theme-muted focus:outline-none focus:border-theme-accent"
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
                className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <BarChart2 className="w-4 h-4" />
                <span>Review Game</span>
              </button>
            </div>
          </div>
        )}

        {/* FEN Tab */}
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
                className="w-full bg-theme-sub border border-theme-border rounded-sm p-3 text-xs font-mono text-white placeholder-theme-muted focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleLoadFen}
                disabled={!fenInput.trim()}
                className="px-5 py-2.5 rounded-sm font-bold text-xs sm:text-sm btn-chess-green flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Load Position</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
