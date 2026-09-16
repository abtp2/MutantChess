// Common Chess Openings / ECO database for Book move detection

export const OPENINGS = [
  { name: "King's Pawn Opening", uci: ["e2e4"] },
  { name: "Open Game", uci: ["e2e4", "e7e5"] },
  { name: "Ruy Lopez", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
  { name: "Italian Game", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
  { name: "Scotch Game", uci: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"] },
  { name: "Sicilian Defense", uci: ["e2e4", "c7c5"] },
  { name: "Sicilian Defense: Open", uci: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4"] },
  { name: "French Defense", uci: ["e2e4", "e7e6"] },
  { name: "Caro-Kann Defense", uci: ["e2e4", "c7c6"] },
  { name: "Scandinavian Defense", uci: ["e2e4", "d7d5"] },
  { name: "Pirc Defense", uci: ["e2e4", "d7d6", "d2d4", "g8f6"] },
  { name: "Queen's Pawn Opening", uci: ["d2d4"] },
  { name: "Queen's Gambit", uci: ["d2d4", "d7d5", "c2c4"] },
  { name: "Queen's Gambit Declined", uci: ["d2d4", "d7d5", "c2c4", "e7e6"] },
  { name: "Queen's Gambit Accepted", uci: ["d2d4", "d7d5", "c2c4", "d5c4"] },
  { name: "Slav Defense", uci: ["d2d4", "d7d5", "c2c4", "c7c6"] },
  { name: "King's Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "g7g6"] },
  { name: "Nimzo-Indian Defense", uci: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"] },
  { name: "English Opening", uci: ["c2c4"] },
  { name: "Réti Opening", uci: ["g1f3"] },
];

export function isBookMove(historyUci, moveIndex) {
  if (moveIndex >= 14) return false; // Book moves usually within first 7 full moves
  const currentPrefix = historyUci.slice(0, moveIndex + 1);
  return OPENINGS.some(opening => {
    if (opening.uci.length < currentPrefix.length) return false;
    for (let i = 0; i < currentPrefix.length; i++) {
      if (opening.uci[i] !== currentPrefix[i]) return false;
    }
    return true;
  });
}

export function detectOpeningName(historyUci) {
  let matched = "Standard Opening";
  for (const opening of OPENINGS) {
    if (opening.uci.length <= historyUci.length) {
      const match = opening.uci.every((move, idx) => historyUci[idx] === move);
      if (match) {
        matched = opening.name;
      }
    }
  }
  return matched;
}
