import './globals.css';

export const metadata = {
  title: 'MutantChess | Next-Gen AI Chess & Analysis',
  description: 'MutantChess - Play against AI bots (including Martin, Ashutosh_dev, Oliver, Luna, and Leo), analyze games with Stockfish 18 WASM, import from Chess.com & Lichess with zero lag and rich themes.',
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
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#13181e] text-[#f0f6fc] antialiased selection:bg-[#4f9db5] selection:text-white">
        {children}
      </body>
    </html>
  );
}
