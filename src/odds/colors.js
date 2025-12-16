// Soft, pastel-like colors for sports; used consistently across Odds pages
export const SPORT_COLORS = {
  average: '#3B82F6',     // blue-500
  football: '#10B981',    // emerald-500
  basketball: '#F59E0B',  // amber-500
  tennis: '#8B5CF6',      // violet-500
  volleyball: '#F472B6',  // pink-400
  cs2: '#64748B',         // slate-500
};

export function sportColor(kind) {
  const k = String(kind || '').toLowerCase();
  return SPORT_COLORS[k] || '#94A3B8'; // slate-400 fallback
}


