export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** $18,450 · $437.50 · −$1,200 */
export function money(n) {
  const v = round2(n || 0);
  const abs = Math.abs(v);
  const hasCents = Math.abs(abs - Math.round(abs)) > 0.001;
  const s = abs.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${v < 0 ? '−' : ''}$${s}`;
}

export function pct(n, digits = 0) {
  if (!isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)} %`;
}
