export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-gray-400 mb-4">The requested page could not be found.</p>
      <a href="/" className="px-4 py-2 bg-theme-btn text-white text-xs font-bold rounded-sm border border-theme-border">
        Return Home
      </a>
    </div>
  );
}
