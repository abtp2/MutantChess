import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'MutantChess | Next-Gen AI Chess & Analysis',
  description: 'MutantChess - Play against AI bots, analyze games with Stockfish 18 WASM, import from Chess.com & Lichess with zero lag and rich themes.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#13181e] text-[#f0f6fc] antialiased selection:bg-[#4f9db5] selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
