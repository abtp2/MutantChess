// Game Importer service for Chess.com, Lichess, PGN, and FEN
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
    const updated = [cleanUser, ...current.filter(u => u.toLowerCase() !== cleanUser)].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save username to localStorage', e);
  }
}

// Fetch games from Chess.com Public API
export async function fetchChessComGames(username) {
  const cleanUser = username.trim().toLowerCase();
  saveUsername('chesscom', cleanUser);

  // 1. Get archives
  const archivesRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/archives`);
  if (!archivesRes.ok) {
    if (archivesRes.status === 404) throw new Error(`Chess.com user "${username}" not found.`);
    throw new Error('Failed to fetch Chess.com games archives.');
  }

  const archivesData = await archivesRes.json();
  const archives = archivesData.archives || [];
  if (archives.length === 0) {
    return [];
  }

  // 2. Fetch the latest month archive
  const latestArchiveUrl = archives[archives.length - 1];
  const gamesRes = await fetch(latestArchiveUrl);
  if (!gamesRes.ok) throw new Error('Failed to fetch monthly games from Chess.com.');

  const gamesData = await gamesRes.json();
  const rawGames = (gamesData.games || []).reverse().slice(0, 20);

  return rawGames.map((g, idx) => {
    const isUserWhite = g.white.username.toLowerCase() === cleanUser;
    let resultText = 'Draw';
    if (g.white.result === 'win') resultText = isUserWhite ? 'Win' : 'Loss';
    else if (g.black.result === 'win') resultText = isUserWhite ? 'Loss' : 'Win';

    return {
      id: `chesscom_${g.uuid || idx}`,
      site: 'Chess.com',
      url: g.url,
      date: new Date(g.end_time * 1000).toLocaleDateString(),
      timeControl: g.time_control || 'Rapid',
      white: {
        username: g.white.username,
        rating: g.white.rating,
      },
      black: {
        username: g.black.username,
        rating: g.black.rating,
      },
      userColor: isUserWhite ? 'white' : 'black',
      result: resultText,
      pgn: g.pgn,
      fen: g.fen,
    };
  });
}

// Fetch games from Lichess Public API
export async function fetchLichessGames(username) {
  const cleanUser = username.trim().toLowerCase();
  saveUsername('lichess', cleanUser);

  const res = await fetch(`https://lichess.org/api/games/user/${cleanUser}?max=15&pgnInJson=true`, {
    headers: { Accept: 'application/x-ndjson' }
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Lichess user "${username}" not found.`);
    throw new Error('Failed to fetch Lichess games.');
  }

  const text = await res.text();
  const lines = text.trim().split('\n').filter(Boolean);
  const games = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const g = JSON.parse(lines[i]);
      const isUserWhite = g.players?.white?.user?.name?.toLowerCase() === cleanUser;
      let resultText = 'Draw';
      if (g.winner === 'white') resultText = isUserWhite ? 'Win' : 'Loss';
      else if (g.winner === 'black') resultText = isUserWhite ? 'Loss' : 'Win';

      games.push({
        id: `lichess_${g.id || i}`,
        site: 'Lichess',
        url: `https://lichess.org/${g.id}`,
        date: new Date(g.createdAt).toLocaleDateString(),
        timeControl: g.speed || (g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : 'Casual'),
        white: {
          username: g.players?.white?.user?.name || 'Anonymous',
          rating: g.players?.white?.rating || '?',
        },
        black: {
          username: g.players?.black?.user?.name || 'Anonymous',
          rating: g.players?.black?.rating || '?',
        },
        userColor: isUserWhite ? 'white' : 'black',
        result: resultText,
        pgn: g.pgn || '',
      });
    } catch (err) {
      // ignore parse error on single line
    }
  }

  return games;
}

// Parse PGN string and return chess moves and metadata
export function parsePgn(pgnText) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText);
    const history = chess.history({ verbose: true });
    return {
      success: true,
      moves: history,
      headers: chess.header(),
      fen: chess.fen(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Invalid PGN format',
    };
  }
}
