import { GAS_DEFAULTS, GasSettings, gasCalculation } from './gas';
export type Config = {
  volume: number; gasVolume: number; flowRate: number; travelSpeed: number;
  diameter: number; depth: number; count: number; qrceGap: number;
  e1: number; e2: number;
  gas: 'Air' | 'N2' | 'Ar';
  gasControl: GasSettings;
};
// Legion-style cell (Gerroll et al., ACS Meas. Sci. Au 2023): Ø7 mm bore, 9 mm well-plate pitch, ≤500 μL.
export const DEFAULTS: Config = {
  volume: 300, gasVolume: 20, flowRate: 150, travelSpeed: 35,
  diameter: 7, depth: 14, count: 3, qrceGap: 2,
  e1: -0.8, e2: -1.2, gas: 'Ar', gasControl: GAS_DEFAULTS
};
// rows: two rows share formulations column-wise; each row runs at its own potential.
// gasket: PDMS opening that defines the exposed glassy-carbon area (Ø6 mm → 28.3 mm²).
export const DESIGN = { rows: 2, pitch: 9, cap: 2.5, gasket: 6, wire: 1, headspace: 1, boundaryVolume: 4, timeScale: 8, maxVolume: 500, voltage: 4 };
// Cap port layout relative to the cell axis (x offsets, mm): needle septum, QRCE feedthrough; vent sits on z.
export const septumOffset = -1.6, qrceOffset = 1.6, ventOffset = 2.1;
export const COLORS =['#0072b2', '#d55e00', '#009e73'];
export const NAMES = ['A', 'B', 'C'];
export const ROWS = ['R1', 'R2'];
export type Cell = { index: number; col: number; row: number; name: string };
// Cell order follows dispensing: each formulation fills R1 then R2 of its column.
export function cells(p: Config): Cell[] {
  return Array.from({ length: p.count * DESIGN.rows }, (_, index) => {
    const col = Math.floor(index / DESIGN.rows), row = index % DESIGN.rows;
    return { index, col, row, name: `${ROWS[row]}·${NAMES[col]}` };
  });
}
export function cellIndex(col: number, row: number) { return col * DESIGN.rows + row; }
export function cellX(col: number, p: Config) { return (col - (p.count - 1) / 2) * DESIGN.pitch; }
export function cellZ(row: number) { return (row - (DESIGN.rows - 1) / 2) * DESIGN.pitch; }
export function rowPotential(row: number, p: Config) { return row === 0 ? p.e1 : p.e2; }
export function arrayHalfWidth(p: Config) { return p.count * DESIGN.pitch / 2 + 4; }
export function capTop(p: Config) { return p.depth + DESIGN.cap; }
export function deliveryInlet(p: Config): [number,number,number] { return [-arrayHalfWidth(p)-15,p.depth+13,-15]; }
export function boreArea(p: Config) { return Math.PI * p.diameter ** 2 / 4; }
export function exposedArea() { return Math.PI * DESIGN.gasket ** 2 / 4; }
export function maxCellVolume(p: Config) { return boreArea(p) * (p.depth - DESIGN.headspace); }
export function liquidHeight(volume: number, p: Config) {
  const a = boreArea(p), wire = Math.PI * DESIGN.wire ** 2 / 4;
  // Volume balance: the QRCE wire hangs from the cap down to qrceGap and displaces liquid above that.
  let lo = 0, hi = volume / Math.max(.01, a - wire) + p.depth;
  for (let i = 0; i < 60; i++) {
    const h = (lo + hi) / 2;
    if (a * h - wire * Math.max(0, h - p.qrceGap) < volume) lo = h; else hi = h;
  }
  return (lo + hi) / 2;
}
export function geometryCheck(p: Config, fills: number[]) {
  const errors: string[] = [];
  if (p.diameter > DESIGN.pitch - 1) errors.push(`Cell bore must leave at least a 1 mm wall at the ${DESIGN.pitch} mm pitch.`);
  if (p.diameter < DESIGN.gasket) errors.push(`Cell bore must be at least the Ø${DESIGN.gasket} mm gasket opening.`);
  if (p.qrceGap <= 0 || p.qrceGap >= p.depth - DESIGN.headspace) errors.push('QRCE tip must sit above the working electrode and below the headspace.');
  [p.e1, p.e2].forEach((e, row) => { if (!Number.isFinite(e) || Math.abs(e) > DESIGN.voltage) errors.push(`${ROWS[row]} potential must lie within ±${DESIGN.voltage} V.`); });
  const heights = fills.map(v => liquidHeight(v, p));
  heights.forEach((h, i) => {
    const name = cells(p)[i]?.name ?? `Cell ${i + 1}`;
    if (h <= p.qrceGap + .5) errors.push(`${name}: QRCE would not be immersed by at least 0.5 mm.`);
    if (h > p.depth - DESIGN.headspace) errors.push(`${name}: less than ${DESIGN.headspace} mm headspace below the septum cap.`);
  });
  return { errors, heights, immersion: Math.min(...heights) - p.qrceGap, headspace: p.depth - Math.max(...heights) };
}
export function segmentLength(volume: number, p:Config=DEFAULTS) { return volume / gasCalculation(p.gasControl).area; }
export function withGasControl(p:Config,g:GasSettings):Config { return {...p,gasControl:g,gasVolume:gasCalculation(g).volume}; }
