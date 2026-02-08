export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};
export const rng = (() => {
  let s = 123456789;
  return () => ((s = Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296;
})();
export const hsl = (h, s, l, a) => `hsl(${h} ${s}% ${l}% / ${a})`;
