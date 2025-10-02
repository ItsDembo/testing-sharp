const P_MIN = 1e-6, P_MAX = 1 - 1e-6;
export const clamp01 = (p: number) => Math.min(P_MAX, Math.max(P_MIN, p));

export const americanToDecimal = (a: number) => (a >= 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a));
export const impliedFromAmerican = (a: number) => (a >= 0 ? 100 / (a + 100) : Math.abs(a) / (Math.abs(a) + 100));
export const impliedFromDecimal = (d: number) => 1 / Math.max(1e-9, d);

export function devigBinary(p1: number, p2: number) {
  const s = p1 + p2; if (!isFinite(s) || s <= 0) return { p1: NaN, p2: NaN };
  return { p1: clamp01(p1 / s), p2: clamp01(p2 / s) };
}

export function median(nums: number[]) {
  if (!nums.length) return NaN;
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
