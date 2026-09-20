// Helper utility for loading and searching the Openings database from openings.json
import rawOpenings from '../data/openings.json';

export function normalizeFen(fen) {
  if (!fen) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const parts = fen.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0]} w KQkq - 0 1`;
  }
  if (parts.length < 6) {
    const turn = parts[1] || 'w';
    const castling = parts[2] || '-';
    const ep = parts[3] || '-';
    const half = parts[4] || '0';
    const full = parts[5] || '1';
    return `${parts[0]} ${turn} ${castling} ${ep} ${half} ${full}`;
  }
  return fen;
}

export function categorizeOpening(name, fen) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('gambit') || lowerName.includes('countergambit')) return 'Gambit';
  if (
    lowerName.includes('sicilian') ||
    lowerName.includes('french') ||
    lowerName.includes('ruy lopez') ||
    lowerName.includes('italian') ||
    lowerName.includes('caro-kann') ||
    lowerName.includes('scandinavian') ||
    lowerName.includes('pirc') ||
    lowerName.includes('petrov') ||
    lowerName.includes('scotch') ||
    lowerName.includes("king's pawn")
  ) {
    return '1.e4';
  }
  if (
    lowerName.includes("queen's gambit") ||
    lowerName.includes('slav') ||
    lowerName.includes("king's indian") ||
    lowerName.includes('nimzo-indian') ||
    lowerName.includes('grünfeld') ||
    lowerName.includes('grunfeld') ||
    lowerName.includes('catalan') ||
    lowerName.includes('london') ||
    lowerName.includes('benoni') ||
    lowerName.includes('dutch') ||
    lowerName.includes("queen's pawn")
  ) {
    return '1.d4';
  }
  if (
    lowerName.includes('english') ||
    lowerName.includes('réti') ||
    lowerName.includes('reti') ||
    lowerName.includes('bird') ||
    lowerName.includes('larsen') ||
    lowerName.includes('grob')
  ) {
    return 'Flank';
  }
  if (lowerName.includes('defense')) return 'Defense';
  return 'Classical';
}

// Pre-process openings once
export const ALL_OPENINGS = rawOpenings.map((item, idx) => ({
  id: `op_${idx}`,
  name: item.name,
  fen: normalizeFen(item.fen),
  pgn: item.pgn || '',
  moves: item.moves || [],
  eco: item.eco || 'A00',
  category: categorizeOpening(item.name, item.fen),
}));

export const OPENING_CATEGORIES = [
  { id: 'all', label: 'All Openings' },
  { id: '1.e4', label: "King's Pawn (1.e4)" },
  { id: '1.d4', label: "Queen's Pawn (1.d4)" },
  { id: 'Gambit', label: 'Gambits' },
  { id: 'Defense', label: 'Defenses' },
  { id: 'Flank', label: 'Flank Openings' },
];
