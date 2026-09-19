// Vector SVG Chess Pieces for MutantChess (Standard Chess.com / Lichess cburnett style)
import React from 'react';

export function ChessPiece({ type, color, className = "w-full h-full select-none pointer-events-none drop-shadow-md" }) {
  const isWhite = color === 'w';
  const fill = isWhite ? "#ffffff" : "#24221f";
  const stroke = isWhite ? "#111111" : "#ffffff";
  const innerLine = isWhite ? "#111111" : "#ffffff";
  const sw = isWhite ? "1.8" : "2";

  // Crisp SVG chess pieces
  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          <path
            d="M 12,36 C 14,33 21,32 23,32 c 2,0 9,1 11,4"
            fill="none"
            stroke={isWhite ? "#d1d5db" : "#ffffff"}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.02,5.08 20,5 C 20,5 20.28,6.5 21,7 C 21.72,7.5 22,10 22,10 z" />
            <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill={isWhite ? "#111" : "#fff"} stroke="none" />
            <path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill={isWhite ? "#111" : "#fff"} stroke="none" />
          </g>
        </svg>
      );
    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="butt">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
              <path d="M 12,36 C 14.5,33.5 16,28 16,26 C 16,23.5 17.5,21 19,19 C 18.5,17 17.5,15.5 17.5,13.5 C 17.5,9.5 21,7.5 22.5,7.5 C 24,7.5 27.5,9.5 27.5,13.5 C 27.5,15.5 26.5,17 26,19 C 27.5,21 29,23.5 29,26 C 29,28 30.5,33.5 33,36 z" />
              <circle cx="22.5" cy="5" r="2.5" />
            </g>
            <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,10 L 22.5,14 M 20.5,12 L 24.5,12" stroke={innerLine} strokeWidth="1.3" />
          </g>
        </svg>
      );
    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 14,17 L 14,29.5 L 31,29.5 L 31,17" />
            <path d="M 14,29.5 L 12,32 L 33,32 L 31,29.5" />
            <path d="M 14,17 L 31,17" stroke={innerLine} strokeWidth="1.2" />
          </g>
        </svg>
      );
    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 8.5,14 C 11.5,14 11,18 11,18 C 11.5,15.5 13.5,15.5 13.5,15.5 C 13.5,15.5 14.5,17 15,19 C 15.5,17 16.5,15.5 16.5,15.5 C 16.5,15.5 18.5,15.5 19,18 C 19,18 18.5,14 21.5,14 C 24.5,14 24,18 24,18 C 24.5,15.5 26.5,15.5 26.5,15.5 C 26.5,15.5 27.5,17 28,19 C 28.5,17 29.5,15.5 29.5,15.5 C 29.5,15.5 31.5,15.5 32,18 C 32,18 31.5,14 34.5,14 C 37,14 36.5,18 36.5,18 L 38,30 C 37,32 36,33 34,34 L 11,34 C 9,33 8,32 7,30 L 8.5,18 C 8.5,18 8,14 8.5,14 z" />
            <path d="M 9,26 C 17.5,24.5 27.5,24.5 36,26" fill="none" stroke={innerLine} strokeWidth="1.3" />
            <path d="M 11,34 L 34,34 L 34,38 L 11,38 z" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        </svg>
      );
    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" stroke={innerLine} strokeWidth="1.6" />
            <path d="M 20,8 L 25,8" stroke={innerLine} strokeWidth="1.6" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
            <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 36.5,35 34.5,29.5 31.5,27 C 28.5,24.5 25.5,24.5 22.5,25.5 C 19.5,24.5 16.5,24.5 13.5,27 C 10.5,29.5 8.5,35 11.5,37 z" />
            <path d="M 11.5,30 C 17,27 28,27 33.5,30" fill="none" stroke={innerLine} strokeWidth="1.3" />
            <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" fill="none" stroke={innerLine} strokeWidth="1.3" />
            <path d="M 11.5,37 C 17,34 28,34 33.5,37" fill="none" stroke={innerLine} strokeWidth="1.3" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}
