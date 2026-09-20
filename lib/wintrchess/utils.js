// WintrChess Utilities & Board Helpers
// Faithfully adapted from WintrCat/wintrchess (shared/src/lib/utils/chess.ts, shared/src/constants/utils.ts, etc.)

export const pieceValues = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: Infinity,
  m: 0,
};

export const pieceNames = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export function adaptPieceColour(colour) {
  if (!colour) return 'w';
  if (colour === 'w' || colour === 'white') return 'white';
  if (colour === 'b' || colour === 'black') return 'black';
  return colour;
}

export function toShortColor(colour) {
  if (!colour) return 'w';
  return colour.charAt(0).toLowerCase();
}

export function flipPieceColour(colour) {
  if (colour === 'w') return 'b';
  if (colour === 'b') return 'w';
  if (colour === 'white') return 'black';
  if (colour === 'black') return 'white';
  return colour === 'w' ? 'b' : 'w';
}

export function parseFen(fen) {
  const fenParts = fen.split(' ');
  const turnColour = fenParts[1] === 'w' ? 'white' : 'black';
  const castlingRights = fenParts[2] || '-';

  return {
    parts: fenParts,
    turnColour,
    castlingRights: {
      kingside: {
        white: castlingRights.includes('K'),
        black: castlingRights.includes('k'),
      },
      queenside: {
        white: castlingRights.includes('Q'),
        black: castlingRights.includes('q'),
      },
    },
    enPassantSquare: fenParts[3] === '-' ? undefined : fenParts[3],
    fiftyMoveClock: parseInt(fenParts[4] || '0', 10),
    fullMoveCount: parseInt(fenParts[5] || '1', 10),
  };
}

export function setFenTurn(fen, colour) {
  const parsedFen = parseFen(fen);
  const targetShort = toShortColor(colour);

  // If turn colour changed, clear en passant square
  if (parsedFen.parts[1] !== targetShort) {
    parsedFen.parts[3] = '-';
  }

  // Update turn colour
  parsedFen.parts[1] = targetShort;

  return parsedFen.parts.join(' ');
}

export function parseSanMove(san) {
  if (!san) return {};
  return {
    castling: san.includes('O'),
    check: san.includes('+'),
    capture: san.includes('x'),
    promotion: san.includes('='),
    checkmate: san.includes('#'),
    piece: san.charAt(0),
  };
}

export function getCaptureSquare(move) {
  if (!move) return null;
  if (move.isEnPassant && typeof move.isEnPassant === 'function' && move.isEnPassant()) {
    return (move.to[0] + move.from[1]);
  }
  if (move.flags && move.flags.includes('e')) {
    return (move.to[0] + move.from[1]);
  }
  return move.to;
}

export function getBoardPieces(board) {
  const pieces = [];
  const b = board.board();
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b[r].length; c++) {
      const piece = b[r][c];
      if (piece) {
        pieces.push({
          square: piece.square,
          type: piece.type,
          color: piece.color,
        });
      }
    }
  }
  return pieces;
}

export function toBoardPiece(move) {
  return {
    type: move.piece,
    square: move.from,
    color: move.color,
  };
}

export function toRawMove(move) {
  return {
    piece: move.piece,
    color: move.color,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

export function minBy(arr, fn) {
  if (!arr || arr.length === 0) return undefined;
  let minItem = arr[0];
  let minValue = fn(minItem);
  for (let i = 1; i < arr.length; i++) {
    const v = fn(arr[i]);
    if (v < minValue) {
      minValue = v;
      minItem = arr[i];
    }
  }
  return minItem;
}

export function isMovesEqual(a, b) {
  if (!a || !b) return a === b;
  return a.from === b.from && a.to === b.to && a.piece === b.piece && a.color === b.color && a.promotion === b.promotion;
}

export function isPiecesEqual(a, b) {
  if (!a || !b) return a === b;
  return a.square === b.square && a.type === b.type && a.color === b.color;
}

export function differenceWith(arr1, arr2, comparator = isMovesEqual) {
  return arr1.filter((item1) => !arr2.some((item2) => comparator(item1, item2)));
}

export function xorWith(arr1, arr2, comparator = isMovesEqual) {
  return [
    ...arr1.filter((item1) => !arr2.some((item2) => comparator(item1, item2))),
    ...arr2.filter((item2) => !arr1.some((item1) => comparator(item1, item2))),
  ];
}
