// Synchronized, High-Performance ChessBoard with Drag-and-Drop & Click-to-Move
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { BOARD_THEMES } from '../lib/themes';
import { ChessPiece } from '../lib/chessPieces';

export default function ChessBoard({
  chess,
  onMove,
  isFlipped = false,
  playerColor = 'w', // 'w', 'b', or null (for free analysis/1v1)
  themeId = 'icy_sea',
  lastMove = null,
  arrow = null,
  disabled = false,
  onBoardWidthChange,
  premoveQueue = [],
  onCancelPremoves,
}) {
  const containerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(480);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionMove, setPromotionMove] = useState(null);

  const boardTheme = BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];

  // Global Escape key cancels premoves
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancelPremoves) onCancelPremoves();
        setSelectedSquare(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancelPremoves]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const clientWidth = containerRef.current.clientWidth;
        if (clientWidth > 0) {
          // On mobile phones, account for viewport height and padding
          const maxAllowed = Math.min(clientWidth, window.innerHeight - 190);
          const computed = Math.max(240, Math.min(560, maxAllowed));
          setBoardWidth(computed);
          if (onBoardWidthChange) {
            onBoardWidthChange(computed);
          }
        }
      }
    };

    updateWidth();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => updateWidth());
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [onBoardWidthChange]);

  // Clear selected square whenever board position changes
  useEffect(() => {
    setSelectedSquare(null);
    setPromotionMove(null);
  }, [chess ? chess.fen() : '']);

  // Compute legal destination squares for currently selected piece
  const legalMovesForSelected = React.useMemo(() => {
    if (!selectedSquare || !chess) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch (e) {
      return [];
    }
  }, [selectedSquare, chess]);

  // Compute square styles for selected piece, legal dots, last move, premove highlights, check glow
  const customSquareStyles = React.useMemo(() => {
    const styles = {};

    // 1. Last move highlights (Chess.com translucent yellow)
    if (lastMove && lastMove.from && lastMove.to) {
      styles[lastMove.from] = { backgroundColor: 'rgba(247, 247, 105, 0.45)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(247, 247, 105, 0.45)' };
    }

    // 2. Queued premove highlights (Chess.com distinct coral-red)
    if (premoveQueue && premoveQueue.length > 0) {
      premoveQueue.forEach((pm) => {
        if (pm.from) styles[pm.from] = { backgroundColor: 'rgba(235, 97, 80, 0.55)' };
        if (pm.to) styles[pm.to] = { backgroundColor: 'rgba(235, 97, 80, 0.75)' };
      });
    }

    // 3. Selected square highlight
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(247, 247, 105, 0.65)',
      };

      // Legal move indicators for selected piece
      legalMovesForSelected.forEach((m) => {
        const destPiece = chess.get(m.to);
        if (destPiece || (m.flags && m.flags.includes('e'))) {
          styles[m.to] = {
            background: 'radial-gradient(circle, transparent 58%, rgba(0, 0, 0, 0.35) 60%)',
            borderRadius: '50%',
          };
        } else {
          styles[m.to] = {
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.35) 24%, transparent 25%)',
            borderRadius: '50%',
          };
        }
      });
    }

    // 4. King in check red radial glow
    if (chess && chess.inCheck()) {
      const board = chess.board();
      const turn = chess.turn();
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r]?.[f];
          if (piece && piece.type === 'k' && piece.color === turn) {
            const kingSquare = `${files[f]}${ranks[r]}`;
            styles[kingSquare] = {
              background:
                'radial-gradient(ellipse at center, rgba(235, 97, 80, 0.95) 0%, rgba(200, 40, 30, 0.5) 60%, transparent 100%)',
            };
            break;
          }
        }
      }
    }

    return styles;
  }, [lastMove, premoveQueue, selectedSquare, legalMovesForSelected, chess]);

  // Click-to-Move Handler supporting both object argument and string
  const handleSquareClick = (arg1) => {
    const square = typeof arg1 === 'object' && arg1 ? arg1.square : arg1;
    if (!square || typeof square !== 'string') return;
    if (disabled || !chess) return;

    const friendlyColor = playerColor || chess.turn();

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        if (premoveQueue && premoveQueue.length > 0) {
          onCancelPremoves?.();
        }
        return;
      }

      // Check if clicked square is a legal move on currently displayed board
      try {
        const test = new Chess(chess.fen());
        const testMove = test.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (testMove) {
          const pieceObj = chess.get(selectedSquare);
          const isPawn = pieceObj && pieceObj.type === 'p';
          const isPromotion =
            isPawn &&
            ((pieceObj.color === 'w' && square[1] === '8') ||
              (pieceObj.color === 'b' && square[1] === '1'));

          if (isPromotion) {
            setPromotionMove({ from: selectedSquare, to: square });
            return;
          }

          if (onMove) {
            onMove({ from: selectedSquare, to: square, promotion: 'q' });
          }
          setSelectedSquare(null);
          return;
        }
      } catch (e) {}

      // Clicked square was NOT a legal destination: cancel premoves like Chess.com
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }

      // If clicked another friendly piece, select it for a new move
      const clickedPiece = chess.get(square);
      if (clickedPiece && clickedPiece.color === friendlyColor) {
        setSelectedSquare(square);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    // No piece previously selected
    const piece = chess.get(square);
    if (piece && piece.color === friendlyColor) {
      // Clicking a friendly piece starts fresh selection
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }
      setSelectedSquare(square);
    } else {
      // User clicked an empty square or opponent square: cancel all premoves like Chess.com
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }
    }
  };

  // Drag & Drop Handler supporting both object argument and positional args
  const handlePieceDrop = (arg1, arg2, arg3) => {
    let sourceSquare, targetSquare, piece;
    if (arg1 && typeof arg1 === 'object' && arg1.sourceSquare) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
      piece = arg1.piece;
    } else {
      sourceSquare = arg1;
      targetSquare = arg2;
      piece = arg3;
    }

    if (!sourceSquare || !targetSquare || sourceSquare === targetSquare) {
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }
      return false;
    }
    if (disabled || !chess) return false;

    const friendlyColor = playerColor || chess.turn();
    const pieceObj = chess.get(sourceSquare);
    if (!pieceObj || pieceObj.color !== friendlyColor) {
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }
      return false;
    }

    try {
      // Check promotion
      const isPawn = pieceObj.type === 'p';
      const isPromotion =
        isPawn &&
        ((pieceObj.color === 'w' && targetSquare[1] === '8') ||
          (pieceObj.color === 'b' && targetSquare[1] === '1'));

      if (isPromotion) {
        setPromotionMove({ from: sourceSquare, to: targetSquare });
        return true;
      }

      // Check legality on currently displayed board
      const test = new Chess(chess.fen());
      const testMove = test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!testMove) {
        // Dropped on an illegal square: cancel all queued premoves like Chess.com
        if (premoveQueue && premoveQueue.length > 0) {
          onCancelPremoves?.();
        }
        return false;
      }

      if (onMove) {
        const ok = onMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        return ok !== false;
      }
      return true;
    } catch (e) {
      if (premoveQueue && premoveQueue.length > 0) {
        onCancelPremoves?.();
      }
      return false;
    }
  };

  const handlePromotionSelect = (promotedPiece) => {
    if (promotionMove && onMove) {
      onMove({ from: promotionMove.from, to: promotionMove.to, promotion: promotedPiece });
      setPromotionMove(null);
      setSelectedSquare(null);
    }
  };

  const customArrows = [];
  if (arrow && arrow.from && arrow.to) {
    customArrows.push({
      startSquare: arrow.from,
      endSquare: arrow.to,
      color: arrow.color || '#81b64c',
    });
  }

  // Draw distinct red arrows for all queued premoves
  if (premoveQueue && premoveQueue.length > 0) {
    premoveQueue.forEach((pm) => {
      if (pm.from && pm.to) {
        customArrows.push({
          startSquare: pm.from,
          endSquare: pm.to,
          color: 'rgba(235, 97, 80, 0.85)',
        });
      }
    });
  }

  const currentFen = chess ? chess.fen() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // react-chessboard v5 options object
  const chessboardOptions = {
    position: currentFen,
    boardOrientation: isFlipped ? 'black' : 'white',
    boardStyle: {
      width: `${boardWidth}px`,
      height: `${boardWidth}px`,
    },
    darkSquareStyle: { backgroundColor: boardTheme.dark },
    lightSquareStyle: { backgroundColor: boardTheme.light },
    squareStyles: customSquareStyles,
    arrows: customArrows,
    allowDrawingArrows: true,
    animationDurationInMs: 160,
    allowDragging: !disabled,
    canDragPiece: ({ square }) => {
      if (disabled || !chess) return false;
      const p = chess.get(square);
      if (!p) return false;
      const friendlyColor = playerColor || chess.turn();
      return p.color === friendlyColor;
    },
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    onSquareRightClick: () => {
      if (onCancelPremoves) onCancelPremoves();
      setSelectedSquare(null);
    },
  };

  const promotionColor = chess ? chess.turn() : 'w';

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center w-full select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        if (onCancelPremoves) onCancelPremoves();
        setSelectedSquare(null);
      }}
    >
      <div
        className="rounded-lg overflow-hidden border border-theme-border shrink-0"
        style={{ width: boardWidth, height: boardWidth }}
      >
        <Chessboard options={chessboardOptions} />
      </div>

      {/* Promotion Choice Dialog */}
      {promotionMove && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-theme-panel border-2 border-theme-accent rounded-xl p-4 flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
              Choose Promotion Piece
            </span>
            <div className="flex gap-2.5">
              {[
                { id: 'q', label: 'Queen' },
                { id: 'r', label: 'Rook' },
                { id: 'b', label: 'Bishop' },
                { id: 'n', label: 'Knight' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePromotionSelect(p.id)}
                  className="w-16 h-20 bg-theme-btn hover:bg-theme-btnHover text-white font-bold rounded-lg border border-theme-border flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 group"
                >
                  <div className="w-9 h-9 flex items-center justify-center">
                    <ChessPiece type={p.id} color={promotionColor} className="w-8 h-8" />
                  </div>
                  <span className="text-[11px] font-semibold text-theme-sec group-hover:text-white">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
