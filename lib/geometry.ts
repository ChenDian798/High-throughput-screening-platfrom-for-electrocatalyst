import { GAS_DEFAULTS, GasSettings, gasCalculation } from './gas';
export type Config = {
  volume: number; gasVolume: number; flowRate: number; travelSpeed: number;
  width: number; length: number; depth: number; count: number;
  postWidth: number; postLength: number; clearance: number;
  gas: 'Air' | 'N2' | 'Ar';
  gasControl: GasSettings;
};
export const DEFAULTS: Config = {
  volume: 80, gasVolume: 20, flowRate: 80, travelSpeed: 35,
  width: 8, length: 5, depth: 4, count: 3,
  postWidth: 6, postLength: 3, clearance: 1, gas: 'Ar', gasControl: GAS_DEFAULTS
};
export const DESIGN = { wall: 2, corner: .6, postCorner: .5, tubeID: 1, boundaryVolume: 4, timeScale: 8 };
export const COLORS = ['#0072b2', '#d55e00', '#009e73'];
export const NAMES = ['A', 'B', 'C'];
export function deliveryInlet(p: Config): [number,number,number] { return [-p.count*(p.width+2)/2-15,p.depth+13,-11]; }
export function roundedArea(w: number, l: number, r: number) {
  const radius = Math.min(r, w / 2, l / 2);
  return w * l - (4 - Math.PI) * radius * radius;
}
export function wellX(i: number, p: Config) { return (i - (p.count - 1) / 2) * (p.width + DESIGN.wall); }
export function liquidHeight(volume: number, tip: number, p: Config) {
  const a = roundedArea(p.width, p.length, DESIGN.corner);
  const b = roundedArea(p.postWidth, p.postLength, DESIGN.postCorner);
  // Monotonic volume balance. The protrusion starts at tip and ends at the sealing plane.
  let lo = 0, hi = Math.max(p.depth * 2, volume / Math.max(.01, a - b) + p.depth);
  for (let i = 0; i < 60; i++) {
    const h = (lo + hi) / 2;
    const displaced = b * Math.max(0, Math.min(h, p.depth) - tip);
    if (a * h - displaced < volume) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}
export function geometryCheck(p: Config, fills: number[]) {
  const errors: string[] = [];
  if (p.clearance <= 0 || p.clearance >= p.depth) errors.push('Tip clearance must be positive and below the well depth.');
  if (p.postWidth >= p.width - .2 || p.postLength >= p.length - .2) errors.push('Protrusions need at least 0.1 mm clearance from every sidewall.');
  const heights = fills.map(v => liquidHeight(v, p.clearance, p));
  heights.forEach((h, i) => {
    if (h <= p.clearance + .01) errors.push(`Well ${i + 1}: protrusion would not be immersed.`);
    if (h >= p.depth - .1) errors.push(`Well ${i + 1}: insufficient headspace (minimum 0.1 mm); closure blocked.`);
  });
  return { errors, heights, postLength: p.depth - p.clearance, headspace: p.depth - Math.max(...heights) };
}
export function segmentLength(volume: number, p:Config=DEFAULTS) { return volume / gasCalculation(p.gasControl).area; }
export function withGasControl(p:Config,g:GasSettings):Config { return {...p,gasControl:g,gasVolume:gasCalculation(g).volume}; }
