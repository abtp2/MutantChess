// Settings and Engine Configuration Manager for MutantChess
// Manages persisted user preferences including Engine Analysis Depth (min 10, default 16)

export const DEFAULT_ANALYSIS_DEPTH = 16;
export const MIN_ANALYSIS_DEPTH = 10;
export const MAX_ANALYSIS_DEPTH = 22;

export const DEPTH_PRESETS = [
  { depth: 10, label: '10', name: 'Fast (Min)', desc: 'Quick overview, lowest latency' },
  { depth: 12, label: '12', name: 'Standard', desc: 'Good balance of speed and depth' },
  { depth: 14, label: '14', name: 'Deep', desc: 'Thorough calculation for tactical positions' },
  { depth: 16, label: '16', name: 'Default', desc: 'Recommended standard for precision reviews and brilliancies' },
  { depth: 18, label: '18', name: 'Master', desc: 'Extensive multi-ply search for complex games' },
  { depth: 20, label: '20', name: 'Max', desc: 'Highest precision tactical depth' },
];

export function getStoredAnalysisDepth() {
  if (typeof window === 'undefined') return DEFAULT_ANALYSIS_DEPTH;
  try {
    const val = localStorage.getItem('mutant_chess_analysis_depth');
    if (!val) return DEFAULT_ANALYSIS_DEPTH;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return DEFAULT_ANALYSIS_DEPTH;
    return Math.max(MIN_ANALYSIS_DEPTH, Math.min(MAX_ANALYSIS_DEPTH, parsed));
  } catch (e) {
    return DEFAULT_ANALYSIS_DEPTH;
  }
}

export function setStoredAnalysisDepth(depth) {
  if (typeof window === 'undefined') return DEFAULT_ANALYSIS_DEPTH;
  try {
    const num = parseInt(depth, 10);
    const clamped = Math.max(
      MIN_ANALYSIS_DEPTH,
      Math.min(MAX_ANALYSIS_DEPTH, isNaN(num) ? DEFAULT_ANALYSIS_DEPTH : num)
    );
    localStorage.setItem('mutant_chess_analysis_depth', clamped.toString());
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('analysis_depth_changed', { detail: clamped }));
    }
    return clamped;
  } catch (e) {
    return DEFAULT_ANALYSIS_DEPTH;
  }
}
