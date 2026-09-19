// Game Importer and Profile Service for Chess.com, Lichess, PGN, and FEN
import { Chess } from 'chess.js';

const STORAGE_KEY_CHESSCOM = 'mutant_chess_chesscom_users';
const STORAGE_KEY_LICHESS = 'mutant_chess_lichess_users';

export function getSavedUsernames() {
  if (typeof window === 'undefined') return { chessCom: [], lichess: [] };
  try {
    const chessCom = JSON.parse(localStorage.getItem(STORAGE_KEY_CHESSCOM) || '[]');
    const lichess = JSON.parse(localStorage.getItem(STORAGE_KEY_LICHESS) || '[]');
    return { chessCom, lichess };
  } catch (e) {
    return { chessCom: [], lichess: [] };
  }
}

export function saveUsername(site, username) {
  if (typeof window === 'undefined' || !username) return;
  const key = site === 'chesscom' ? STORAGE_KEY_CHESSCOM : STORAGE_KEY_LICHESS;
  try {
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const cleanUser = username.trim().toLowerCase();
    const updated = [cleanUser, ...current.filter((u) => u.toLowerCase() !== cleanUser)].slice(0, 8);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save username to localStorage', e);
  }
}

// Fetch user profile, avatar, and ratings from Chess.com Public API
export async function fetchChessComProfile(username) {
  const cleanUser = username.trim().toLowerCase();
  try {
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${cleanUser}`),
      fetch(`https://api.chess.com/pub/player/${cleanUser}/stats`),
    ]);

    if (!profileRes.ok) {
      if (profileRes.status === 404) throw new Error(`Chess.com user "${username}" not found.`);
      throw new Error('Failed to fetch Chess.com profile.');
    }

    const profile = await profileRes.json();
    const stats = statsRes.ok ? await statsRes.json() : {};

    return {
      site: 'chesscom',
      username: profile.username || username,
      name: profile.name || profile.username || username,
      avatar: profile.avatar || null,
      title: profile.title || null,
      country: profile.country || null,
      url: profile.url || `https://www.chess.com/member/${cleanUser}`,
      ratings: {
        bullet: stats.chess_bullet?.last?.rating || null,
        blitz: stats.chess_blitz?.last?.rating || null,
        rapid: stats.chess_rapid?.last?.rating || null,
        daily: stats.chess_daily?.last?.rating || null,
      },
    };
  } catch (e) {
    throw e;
  }
}

// Fetch user profile, avatar, and ratings from Lichess Public API
export async function fetchLichessProfile(username) {
  const cleanUser = username.trim().toLowerCase();
  try {
    const res = await fetch(`https://lichess.org/api/user/${cleanUser}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Lichess user "${username}" not found.`);
      throw new Error('Failed to fetch Lichess profile.');
    }

    const data = await res.json();
    return {
      site: 'lichess',
      username: data.username || username,
      name: data.profile?.realName || data.username || username,
      avatar: data.profile?.avatar || null,
      title: data.title || null,
      url: `https://lichess.org/@/${data.username}`,
      ratings: {
        bullet: data.perfs?.bullet?.rating || null,
        blitz: data.perfs?.blitz?.rating || null,
        rapid: data.perfs?.rapid?.rating || null,
        classical: data.perfs?.classical?.rating || null,
      },
    };
  } catch (e) {
    throw e;
  }
}

// Fetch recent games from Chess.com Public API with backward pagination support
export async function fetchChessComGames(username, {
  archiveIndex = null,
  archives = null,
  monthGames = null,
  monthOffset = 0,
  pageSize = 25,
} = {}) {
  const cleanUser = username.trim().toLowerCase();
  saveUsername('chesscom', cleanUser);

  let archiveList = archives;
  if (!archiveList) {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/archives`);
    if (!archivesRes.ok) {
      if (archivesRes.status === 404) throw new Error(`Chess.com user "${username}" not found.`);
      throw new Error('Failed to fetch Chess.com games archives.');
    }

    const archivesData = await archivesRes.json();
    archiveList = archivesData.archives || [];
  }

  if (archiveList.length === 0) {
    return { games: [], archives: [], archiveIndex: null, monthGames: [], monthOffset: 0, hasMore: false };
  }

  let currIdx = archiveIndex !== null ? archiveIndex : archiveList.length - 1;
  let cachedMonthGames = monthGames;
  let currOffset = monthOffset;
  const resultRawGames = [];

  while (resultRawGames.length < pageSize && currIdx >= 0) {
    if (!cachedMonthGames) {
      const archiveUrl = archiveList[currIdx];
      try {
        const gamesRes = await fetch(archiveUrl);
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          cachedMonthGames = (gamesData.games || []).reverse();
          currOffset = 0;
        } else {
          cachedMonthGames = [];
        }
      } catch (e) {
        cachedMonthGames = [];
      }
    }

    const remainingInMonth = cachedMonthGames.slice(currOffset);
    const needed = pageSize - resultRawGames.length;
    const chunk = remainingInMonth.slice(0, needed);
    resultRawGames.push(...chunk);
    currOffset += chunk.length;

    if (currOffset >= cachedMonthGames.length) {
      // Month exhausted, move backward to previous month
      currIdx--;
      cachedMonthGames = null;
      currOffset = 0;
    }
  }

  const hasMore = currIdx >= 0 || (cachedMonthGames && currOffset < cachedMonthGames.length);

  const formattedGames = resultRawGames.map((g, idx) => {
    const isUserWhite = g.white.username.toLowerCase() === cleanUser;
    let resultText = 'Draw';
    let scoreText = '1/2-1/2';
    if (g.white.result === 'win') {
      resultText = isUserWhite ? 'Win' : 'Loss';
      scoreText = '1-0';
    } else if (g.black.result === 'win') {
      resultText = isUserWhite ? 'Loss' : 'Win';
      scoreText = '0-1';
    }

    const timeControl = g.time_class
      ? `${g.time_class.charAt(0).toUpperCase() + g.time_class.slice(1)}`
      : (g.time_control || 'Rapid');

    return {
      id: `chesscom_${g.uuid || g.url || idx}_${g.end_time}`,
      site: 'Chess.com',
      url: g.url,
      date: new Date(g.end_time * 1000).toLocaleDateString(),
      endTime: g.end_time * 1000,
      timeClass: (g.time_class || 'rapid').toLowerCase(),
      timeControl,
      white: {
        username: g.white.username,
        rating: g.white.rating,
        avatar: null,
      },
      black: {
        username: g.black.username,
        rating: g.black.rating,
        avatar: null,
      },
      userColor: isUserWhite ? 'white' : 'black',
      opponent: isUserWhite ? g.black.username : g.white.username,
      opponentRating: isUserWhite ? g.black.rating : g.white.rating,
      result: resultText,
      score: scoreText,
      pgn: g.pgn,
      fen: g.fen,
    };
  });

  return {
    games: formattedGames,
    archives: archiveList,
    archiveIndex: currIdx,
    monthGames: cachedMonthGames,
    monthOffset: currOffset,
    hasMore,
  };
}

// Fetch recent games from Lichess Public API with pagination support
export async function fetchLichessGames(username, { until = null, max = 25 } = {}) {
  const cleanUser = username.trim().toLowerCase();
  saveUsername('lichess', cleanUser);

  let url = `https://lichess.org/api/games/user/${cleanUser}?max=${max}&pgnInJson=true`;
  if (until) {
    url += `&until=${until}`;
  }

  const res = await fetch(url, {
    headers: { Accept: 'application/x-ndjson' },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Lichess user "${username}" not found.`);
    throw new Error('Failed to fetch Lichess games.');
  }

  const text = await res.text();
  const lines = text.trim().split('\n').filter(Boolean);
  const games = [];
  let oldestCreatedAt = null;

  for (let i = 0; i < lines.length; i++) {
    try {
      const g = JSON.parse(lines[i]);
      const isUserWhite = g.players?.white?.user?.name?.toLowerCase() === cleanUser;
      let resultText = 'Draw';
      let scoreText = '1/2-1/2';
      if (g.winner === 'white') {
        resultText = isUserWhite ? 'Win' : 'Loss';
        scoreText = '1-0';
      } else if (g.winner === 'black') {
        resultText = isUserWhite ? 'Loss' : 'Win';
        scoreText = '0-1';
      }

      if (!oldestCreatedAt || g.createdAt < oldestCreatedAt) {
        oldestCreatedAt = g.createdAt;
      }

      const speed = g.speed || (g.clock ? 'rapid' : 'casual');
      const timeControl = g.speed
        ? `${g.speed.charAt(0).toUpperCase() + g.speed.slice(1)}`
        : (g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : 'Casual');

      games.push({
        id: `lichess_${g.id || i}`,
        site: 'Lichess',
        url: `https://lichess.org/${g.id}`,
        date: new Date(g.createdAt).toLocaleDateString(),
        endTime: g.createdAt,
        timeClass: speed.toLowerCase(),
        timeControl,
        white: {
          username: g.players?.white?.user?.name || 'Anonymous',
          rating: g.players?.white?.rating || '?',
          avatar: null,
        },
        black: {
          username: g.players?.black?.user?.name || 'Anonymous',
          rating: g.players?.black?.rating || '?',
          avatar: null,
        },
        userColor: isUserWhite ? 'white' : 'black',
        opponent: isUserWhite ? (g.players?.black?.user?.name || 'Anonymous') : (g.players?.white?.user?.name || 'Anonymous'),
        opponentRating: isUserWhite ? g.players?.black?.rating : g.players?.white?.rating,
        result: resultText,
        score: scoreText,
        pgn: g.pgn || '',
      });
    } catch (err) {
      // ignore single line parse error
    }
  }

  return {
    games,
    oldestTimestamp: oldestCreatedAt ? oldestCreatedAt - 1 : null,
    hasMore: games.length >= max,
  };
}

// Parse PGN string and extract moves plus complete game headers
export function parsePgn(pgnText) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText);
    const history = chess.history({ verbose: true });
    const headers = chess.header();

    return {
      success: true,
      moves: history,
      headers: {
        white: headers.White || 'White',
        black: headers.Black || 'Black',
        whiteElo: headers.WhiteElo || null,
        blackElo: headers.BlackElo || null,
        result: headers.Result || '*',
        opening: headers.Opening || headers.ECO || null,
        event: headers.Event || null,
        timeControl: headers.TimeControl || null,
        date: headers.Date || null,
      },
      fen: chess.fen(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Invalid PGN format',
    };
  }
}

const avatarCache = new Map();

// Fetch avatar for any player username from Chess.com or Lichess
export async function fetchPlayerAvatar(username, site = null) {
  if (!username) return null;
  const clean = username.trim().toLowerCase();
  if (['white', 'black', 'player', 'you', 'computer', 'anonymous', 'stockfish'].includes(clean)) {
    return null;
  }
  if (avatarCache.has(clean)) {
    return avatarCache.get(clean);
  }

  // 1. Try Chess.com
  if (!site || site === 'chesscom' || site === 'Chess.com') {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}`, {
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.avatar) {
          avatarCache.set(clean, data.avatar);
          return data.avatar;
        }
      }
    } catch (e) {}
  }

  // 2. Try Lichess
  if (!site || site === 'lichess' || site === 'Lichess.org') {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}`, {
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const av = data.profile?.avatar || null;
        if (av) {
          avatarCache.set(clean, av);
          return av;
        }
      }
    } catch (e) {}
  }

  avatarCache.set(clean, null);
  return null;
}

