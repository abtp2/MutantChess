// Synchronized, High-Performance ChessBoard with Drag-and-Drop, Click-to-Move, and React.memo
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { BOARD_THEMES } from '../lib/themes';
import { ChessPiece } from '../lib/chessPieces';

import ClassificationIcon from './ClassificationIcon';

function MoveAnnotationBadge({ classification }) {
  if (!classification) return null;

  return (
    <div
      title={`${classification.label || 'Move'}: ${classification.description || ''}`}
      className="absolute top-0 right-0 z-30 pointer-events-none select-none flex items-center justify-center animate-badge-pop filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      style={{
        width: '45%',
        height: '45%',
        maxWidth: '38px',
        maxHeight: '38px',
        minWidth: '24px',
        minHeight: '24px',
        transform: 'translate(15%, -15%)',
      }}
    >
      <ClassificationIcon classification={classification} size="100%" />
    </div>
  );
}

function ChessBoardComponent({
  chess,
  onMove,
  onPremove,
  isFlipped = false,
  playerColor = 'w',
  themeId = 'glass',
  lastMove = null,
  arrow = null,
  disabled = false,
  onBoardWidthChange,
  premoveQueue = [],
  onCancelPremoves,
  annotation = null,
  annotations = null,
  customBoardWidth = null,
  evalBar = null,
}) {
  const containerRef = useRef(null);
  const lastWidthRef = useRef(0);
  const [boardWidth, setBoardWidth] = useState(560);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [promotionMove, setPromotionMove] = useState(null);

  const boardTheme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES.find((t) => t.id === 'glass') || BOARD_THEMES[0],
    [themeId]
  );

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

  // Debounced, stable ResizeObserver to prevent infinite resize thrashing
  useEffect(() => {
    let timeout = null;

    const updateWidth = () => {
      if (!containerRef.current) return;
      const clientWidth = containerRef.current.clientWidth;
      if (clientWidth <= 0) return;

      const availWidth = evalBar ? Math.max(200, clientWidth - 28) : Math.max(200, clientWidth - 4);

      let computed = 560;
      if (customBoardWidth && typeof customBoardWidth === 'number' && customBoardWidth > 0) {
        computed = Math.min(availWidth, customBoardWidth);
      } else {
        const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
        
        if (isDesktop) {
          // Desktop: comfortable, balanced width capped at 680px, taking player cards and bars into account
          const heightLimit = Math.max(360, vh - 180);
          const maxAllowed = Math.min(availWidth, heightLimit);
          computed = Math.max(300, Math.min(680, maxAllowed));
        } else {
          // Mobile & Tablet: maximize available width while keeping board square within viewport height
          const heightLimit = Math.max(240, vh - 140);
          const maxAllowed = Math.min(availWidth, heightLimit);
          computed = Math.max(200, maxAllowed);
        }
      }

      if (Math.abs(computed - lastWidthRef.current) > 3) {
        lastWidthRef.current = computed;
        setBoardWidth(computed);
        if (onBoardWidthChange) {
          onBoardWidthChange(computed);
        }
      }
    };

    updateWidth();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(updateWidth, 40);
      });
      ro.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [onBoardWidthChange, customBoardWidth, !!evalBar]);

  const currentFen = chess ? chess.fen() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  // Clear selected square whenever board position changes
  useEffect(() => {
    setSelectedSquare(null);
    setPromotionMove(null);
  }, [currentFen]);

  // Compute legal destination squares for currently selected piece
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !chess) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch (e) {
      return [];
    }
  }, [selectedSquare, chess]);

  // Compute square styles for selected piece, legal dots, last move, check glow
  const customSquareStyles = useMemo(() => {
    const styles = {};

    // 1. Last move highlights
    if (lastMove && lastMove.from && lastMove.to) {
      styles[lastMove.from] = { backgroundColor: 'rgba(247, 247, 105, 0.42)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(247, 247, 105, 0.42)' };
    }

    // 2. Queued premove highlights
    if (premoveQueue && premoveQueue.length > 0) {
      premoveQueue.forEach((pm) => {
        if (pm.from) styles[pm.from] = { backgroundColor: 'rgba(235, 97, 80, 0.55)' };
        if (pm.to) styles[pm.to] = { backgroundColor: 'rgba(235, 97, 80, 0.75)' };
      });
    }

    // 3. Selected square & legal move indicators
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(247, 247, 105, 0.65)',
      };

      legalMovesForSelected.forEach((m) => {
        const destPiece = chess ? chess.get(m.to) : null;
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

  // Click-to-Move Handler
  const handleSquareClick = useCallback(
    (arg1) => {
      const square = typeof arg1 === 'object' && arg1 ? arg1.square : arg1;
      if (!square || typeof square !== 'string') return;
      if (disabled || !chess) return;

      const friendlyColor = playerColor || chess.turn();
      const isPlayerTurn = chess.turn() === friendlyColor;

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }

        const targetPiece = chess.get(square);

        // If clicking another friendly piece, re-select that piece instead
        if (targetPiece && targetPiece.color === friendlyColor) {
          setSelectedSquare(square);
          return;
        }

        // Live Move (Player's turn)
        if (isPlayerTurn) {
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

          setSelectedSquare(null);
          return;
        }

        // Premove (Opponent's turn)
        const pieceObj = chess.get(selectedSquare);
        if (pieceObj && pieceObj.color === friendlyColor) {
          const isPawn = pieceObj.type === 'p';
          const isPromotion =
            isPawn &&
            ((pieceObj.color === 'w' && square[1] === '8') ||
              (pieceObj.color === 'b' && square[1] === '1'));

          if (onPremove) {
            onPremove({ from: selectedSquare, to: square, promotion: isPromotion ? 'q' : undefined });
          }
        }
        setSelectedSquare(null);
        return;
      }

      // First click: select friendly piece
      const piece = chess.get(square);
      if (piece && piece.color === friendlyColor) {
        setSelectedSquare(square);
      } else {
        if (premoveQueue && premoveQueue.length > 0) {
          onCancelPremoves?.();
        }
      }
    },
    [disabled, chess, playerColor, selectedSquare, premoveQueue, onCancelPremoves, onMove, onPremove]
  );

  // Drag & Drop Handler
  const handlePieceDrop = useCallback(
    (arg1, arg2, arg3) => {
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
        return false;
      }
      if (disabled || !chess) return false;

      const friendlyColor = playerColor || chess.turn();
      const pieceObj = chess.get(sourceSquare);
      if (!pieceObj || pieceObj.color !== friendlyColor) {
        return false;
      }

      const isPlayerTurn = chess.turn() === friendlyColor;

      // Case A: LIVE MOVE (Player's turn)
      if (isPlayerTurn) {
        try {
          const isPawn = pieceObj.type === 'p';
          const isPromotion =
            isPawn &&
            ((pieceObj.color === 'w' && targetSquare[1] === '8') ||
              (pieceObj.color === 'b' && targetSquare[1] === '1'));

          if (isPromotion) {
            setPromotionMove({ from: sourceSquare, to: targetSquare });
            return true;
          }

          const test = new Chess(chess.fen());
          const testMove = test.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
          if (!testMove) {
            return false;
          }

          if (onMove) {
            const ok = onMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
            return ok !== false;
          }
          return true;
        } catch (e) {
          return false;
        }
      }

      // Case B: PREMOVE (Opponent's turn)
      const destPiece = chess.get(targetSquare);
      if (destPiece && destPiece.color === friendlyColor) {
        // Cannot capture own piece
        return false;
      }

      const isPawn = pieceObj.type === 'p';
      const isPromotion =
        isPawn &&
        ((pieceObj.color === 'w' && targetSquare[1] === '8') ||
          (pieceObj.color === 'b' && targetSquare[1] === '1'));

      const premoveObj = {
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      };

      if (onPremove) {
        onPremove(premoveObj);
      }
      return true;
    },
    [disabled, chess, playerColor, onMove, onPremove]
  );

  const handlePromotionSelect = useCallback(
    (promotedPiece) => {
      if (promotionMove && onMove) {
        onMove({ from: promotionMove.from, to: promotionMove.to, promotion: promotedPiece });
        setPromotionMove(null);
        setSelectedSquare(null);
      }
    },
    [promotionMove, onMove]
  );

  const customArrows = useMemo(() => {
    const arrows = [];
    if (arrow && arrow.from && arrow.to) {
      // Defensive safeguard: ensure there is actually a piece on arrow.from matching active turn
      const piece = chess ? chess.get(arrow.from) : null;
      if (piece && piece.color === chess.turn()) {
        arrows.push({
          startSquare: arrow.from,
          endSquare: arrow.to,
          color: arrow.color || '#81b64c',
        });
      }
    }

    if (premoveQueue && premoveQueue.length > 0) {
      premoveQueue.forEach((pm) => {
        if (pm.from && pm.to) {
          arrows.push({
            startSquare: pm.from,
            endSquare: pm.to,
            color: 'rgba(235, 97, 80, 0.85)',
          });
        }
      });
    }
    return arrows;
  }, [arrow, premoveQueue, chess]);

  const hasAnnotations = !!(annotation || annotations);

  // Custom Square Renderer for move annotation badges (only active when annotations present)
  const renderSquare = useCallback(
    ({ piece, square, children }) => {
      let squareAnnotation = null;
      if (annotation && annotation.square === square) {
        squareAnnotation = annotation.classification;
      } else if (annotations && annotations[square]) {
        squareAnnotation = annotations[square];
      }

      return (
        <div className="relative w-full h-full">
          {children}
          {squareAnnotation && <MoveAnnotationBadge classification={squareAnnotation} />}
        </div>
      );
    },
    [annotation, annotations]
  );

  // Memoize chessboardOptions so react-chessboard does NOT re-initialize on every render
  const chessboardOptions = useMemo(() => {
    return {
      position: currentFen,
      boardOrientation: isFlipped ? 'black' : 'white',
      boardStyle: {
        width: '100%',
        height: '100%',
      },
      darkSquareStyle: { backgroundColor: boardTheme.dark },
      lightSquareStyle: { backgroundColor: boardTheme.light },
      darkSquareNotationStyle: {
        color: boardTheme.light,
        fontWeight: '700',
      },
      lightSquareNotationStyle: {
        color: boardTheme.dark,
        fontWeight: '700',
      },
      alphaNotationStyle: {
        fontSize: boardWidth < 420 ? '8.5px' : '10px',
        fontWeight: '700',
        lineHeight: 1,
        bottom: 2,
        right: 3,
        userSelect: 'none',
      },
      numericNotationStyle: {
        fontSize: boardWidth < 420 ? '8.5px' : '10px',
        fontWeight: '700',
        lineHeight: 1,
        top: 2,
        left: 3,
        userSelect: 'none',
      },
      squareStyles: customSquareStyles,
      arrows: customArrows,
      allowDrawingArrows: true,
      animationDurationInMs: 120,
      allowDragging: !disabled,
      dragActivationDistance: 4,
      draggingPieceGhostStyle: { opacity: 0, visibility: 'hidden' },
      squareRenderer: hasAnnotations ? renderSquare : undefined,
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
  }, [
    currentFen,
    isFlipped,
    boardTheme.dark,
    boardTheme.light,
    boardWidth,
    customSquareStyles,
    customArrows,
    disabled,
    hasAnnotations,
    renderSquare,
    chess,
    playerColor,
    handlePieceDrop,
    handleSquareClick,
    onCancelPremoves,
  ]);

  const promotionColor = chess ? chess.turn() : 'w';

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center w-full select-none"
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onCancelPremoves) onCancelPremoves();
        setSelectedSquare(null);
      }}
    >
      <div className="flex items-stretch gap-0 border border-theme-border rounded-[3px] overflow-hidden bg-[#181715] shadow-md shrink-0">
        {evalBar}
        <div
          className="shrink-0 box-content"
          style={{ width: boardWidth, height: boardWidth, touchAction: 'none' }}
        >
          <Chessboard options={chessboardOptions} />
        </div>
      </div>

      {/* Promotion Choice Dialog */}
      {promotionMove && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 animate-fadeIn">
          <div className="bg-theme-panel border-2 border-theme-accent rounded-sm p-3 sm:p-4 flex flex-col items-center gap-2.5 sm:gap-3 shadow-2xl max-w-[95vw]">
            <span className="text-xs font-bold text-theme-text uppercase tracking-wider">
              Choose Promotion Piece
            </span>
            <div className="flex gap-1.5 sm:gap-2.5">
              {[
                { id: 'q', label: 'Queen' },
                { id: 'r', label: 'Rook' },
                { id: 'b', label: 'Bishop' },
                { id: 'n', label: 'Knight' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePromotionSelect(p.id)}
                  className="w-14 sm:w-16 h-18 sm:h-20 bg-theme-btn hover:bg-theme-btnHover text-white font-bold rounded-sm border border-theme-border flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center">
                    <ChessPiece type={p.id} color={promotionColor} className="w-7 sm:w-8 h-7 sm:h-8" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-theme-sec group-hover:text-white">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ChessBoard = React.memo(ChessBoardComponent);
export default ChessBoard;
