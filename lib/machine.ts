import { Config, DEFAULTS, DESIGN, NAMES, ROWS, arrayHalfWidth, capTop, cellIndex, cellX, cellZ, cells, geometryCheck, septumOffset } from './geometry';
import { gasCalculation, gasError } from './gas';
export type Position = [number, number, number];
export type Segment = { kind: string; volume: number; source?: string };
export type Step = { kind: 'move' | 'select' | 'stop' | 'gas' | 'transport' | 'load' | 'dispense' | 'waste' | 'apply' | 'off' | 'flush'; name: string; duration: number; station?: string; target?: Position; index?: number; col?: number; last?: boolean; segment?: Segment };
export type GasInjection = { flow:number; seconds:number; area:number; predicted:number; pressure:number; measured?:number };
export type Machine = {
  config: Config; fills: number[]; segments: Segment[]; queue: Step[];
  elapsed: number; startPosition: Position; position: Position; station: string;
  outputs: boolean; paused: boolean; loaded: boolean; nextWell: number;
  log: string[]; completed: string[]; wasteVolume: number;
  transported:boolean; transport:number; lastGasInjection:GasInjection|null;
};
export type Action = 'full' | 'load' | 'generate' | 'insertGas' | 'transport' | 'a' | 'b' | 'c' | 'gap' | 'park' | 'waste' | 'apply' | 'off' | 'flush';
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'full', label: 'Run Full Sequence' }, { id: 'load', label: 'Load Segmented Train' },
  { id: 'a', label: 'Dispense A → R1, R2' }, { id: 'gap', label: 'Discharge Gas Gap to Waste' },
  { id: 'b', label: 'Dispense B → R1, R2' }, { id: 'c', label: 'Dispense C → R1, R2' },
  { id: 'park', label: 'Park Nozzle' }, { id: 'apply', label: 'Apply Row Potentials' },
  { id: 'off', label: 'Cell Outputs Off' }, { id: 'flush', label: 'Flush Delivery Line' }
  ,{ id: 'waste', label: 'Move to Waste / Cleaning' }
];
export function safeHeight(p: Config) { return capTop(p) + 6; }
export function wastePosition(p: Config): Position { return [-arrayHalfWidth(p) - 9, p.depth + 5, 0]; }
export function parkPosition(p: Config): Position { return [arrayHalfWidth(p) + 7, capTop(p) + 4, 9]; }
// Nozzle body rests 0.5 mm above the cap; its needle passes through the septum into the headspace.
export function septumPosition(col: number, row: number, p: Config): Position { return [cellX(col,p) + septumOffset, capTop(p) + .5, cellZ(row)]; }
export function initial(config: Config = DEFAULTS): Machine {
  config={...config,gasVolume:gasCalculation(config.gasControl).volume};
  const position = wastePosition(config);
  return { config, fills: Array(config.count * DESIGN.rows).fill(0), segments: [], queue: [], elapsed: 0,
    startPosition: position, position, station: 'Waste', outputs: false, paused: false,
    loaded: false, nextWell: 0, log: ['Ready. Cell outputs off; outlet anti-drip closed.'], completed: [], wasteVolume: 0,
    transported:false,transport:0,lastGasInjection:null };
}
function move(target: Position, station: string, from: Position, p: Config): Step {
  return { kind: 'move', name: `Move to ${station}`, station, target, duration: Math.max(.2, Math.hypot(...target.map((v,i) => v - from[i])) / p.travelSpeed) };
}
function travel(from: Position, target: Position, station: string, p: Config): Step[] {
  const up: Position = [from[0], safeHeight(p), from[2]];
  const across: Position = [target[0], safeHeight(p), target[2]];
  return [move(up, 'Z clearance', from, p), move(across, 'Travel', up, p), move(target, station, across, p)];
}
// Each formulation slug carries enough liquid for both rows of its column.
function train(p: Config): Segment[] {
  return Array.from({ length: p.count }, (_, i) => [
    { kind: NAMES[i], volume: p.volume * DESIGN.rows },
    ...(i < p.count - 1 ? [{ kind: 'boundary', volume: DESIGN.boundaryVolume, source: NAMES[i] }, { kind: p.gas, volume: p.gasVolume }, { kind: 'boundary', volume: DESIGN.boundaryVolume, source: NAMES[i+1] }] : [])
  ]).flat();
}
function gasStep(p:Config):Step {
  const g=gasCalculation(p.gasControl);
  return {kind:'gas',name:`OPEN ${p.gas} valve → WAIT ${(g.seconds*1000).toFixed(1)} ms → CLOSE valve`,duration:g.seconds,segment:{kind:p.gas,volume:g.volume}};
}
function loadSteps(p: Config): Step[] {
  return train(p).flatMap(segment=>segment.kind===p.gas?[gasStep(p),{kind:'stop' as const,name:'CLOSE GAS VALVE · phase switch',duration:.12}]:[
    {kind:'select' as const,name:`SELECT ${segment.source??segment.kind}`,duration:.12,segment},
    {kind:'load' as const,name:`${segment.kind==='boundary'?'Stage boundary':`${segment.kind} dosing`} · ${segment.volume} μL`,segment,duration:segment.volume/p.flowRate},
    {kind:'stop' as const,name:'STOP LIQUID · pump off',duration:.12}
  ]);
}
function transportStep():Step { return {kind:'transport',name:'Transport Train · move prepared train toward outlet',duration:2}; }
export function visibleSegments(s:Machine):Segment[] {
  const step=s.queue[0];
  return (step?.kind==='load'||step?.kind==='gas')&&step.segment?[...s.segments,{...step.segment,volume:step.segment.volume*s.elapsed/step.duration}]:s.segments;
}
export function segmentLayout(s:Machine) {
  const segments=visibleSegments(s),total=segments.reduce((v,seg)=>v+seg.volume,0);
  const capacity=Math.max(s.config.count*DESIGN.rows*s.config.volume+(s.config.count-1)*(s.config.gasVolume+2*DESIGN.boundaryVolume),total,1)*1.45;
  // Generation displaces earlier segments from the inlet. Dedicated transport advances the whole train to the outlet.
  const occupied=total/capacity;
  let cursor=occupied+s.transport*(1-occupied);
  return segments.map(segment=>{const end=Math.min(1,Math.max(0,cursor));cursor-=segment.volume/capacity;return {segment,start:Math.min(1,Math.max(0,cursor)),end};});
}
export function calibrate(s:Machine,measured:number):Machine {
  if(s.queue.length||!s.lastGasInjection||!Number.isFinite(measured)||measured<=0) return s;
  const factor=measured/s.lastGasInjection.predicted;
  return {...s,config:{...s.config,gasControl:{...s.config.gasControl,calibrationFactor:factor}},lastGasInjection:{...s.lastGasInjection,measured},log:[...s.log,`Calibration recorded: measured ${measured} mm, k=${factor.toFixed(4)}. Empirical estimate only; valid near tested conditions.`].slice(-60)};
}
function gapSteps(p: Config): Step[] {
  return [{ kind: 'boundary', volume: DESIGN.boundaryVolume }, { kind: p.gas, volume: p.gasVolume }, { kind: 'boundary', volume: DESIGN.boundaryVolume }].map(segment => ({ kind: 'waste', name: `Waste ${segment.kind}`, segment, duration: segment.volume / p.flowRate }));
}
export function cellStation(index: number, p: Config) { return `Cell ${cells(p)[index].name}`; }
function dose(col: number, row: number, p: Config): Step {
  const index = cellIndex(col,row);
  return { kind: 'dispense', name: `Dispense ${NAMES[col]} through septum → ${cells(p)[index].name}`, index, col, last: row === DESIGN.rows - 1, duration: p.volume / p.flowRate };
}
export function disabledReason(s: Machine, a: Action): string | null {
  if (s.queue.length) return 'Finish or reset the active operation.';
  const p = s.config;
  if(['full','load','generate','insertGas'].includes(a)&&gasError(p.gasControl)) return gasError(p.gasControl);
  if (a === 'off') return s.outputs ? null : 'Cell outputs are already off.';
  if (a === 'apply') {
    if (s.outputs) return 'Row potentials are already applied.';
    if (s.station !== 'Park') return 'Park the nozzle clear of the septa first.';
    return geometryCheck(p, s.fills).errors[0] ?? null;
  }
  if (s.outputs) return 'Switch cell outputs off before fluidic or robot operations.';
  if (a === 'park' || a === 'waste') return null;
  if (a === 'flush') return s.station !== 'Waste' ? 'Flush only at waste. Move to Waste / Cleaning first.' : null;
  if (a === 'insertGas') return s.station!=='Waste'?'Timed injection only at waste. Move to Waste / Cleaning first.':s.loaded?'Flush or reset the prepared train before a calibration injection.':null;
  if (a === 'transport') return !s.loaded?'Generate the liquid–gas train first.':s.transported?'Train is already at the delivery outlet.':s.station!=='Waste'?'Transport setup requires the nozzle at waste.':null;
  if (a === 'full' || a === 'load' || a === 'generate') {
    if (s.loaded || s.segments.length || s.fills.some(v => v > 0)) return 'Reset the visualization before preparing a new train.';
    return geometryCheck(p, Array(p.count * DESIGN.rows).fill(p.volume)).errors[0] ?? null;
  }
  if (a === 'gap') return s.segments[0]?.kind === 'boundary' ? null : 'No separating gas/boundary group is next at the outlet.';
  const i = ['a','b','c'].indexOf(a);
  if(!s.transported) return 'Press Transport Train before dispensing the prepared train.';
  if (i >= p.count) return 'This column is not active.';
  if (!s.loaded || s.nextWell !== i || s.segments[0]?.kind !== NAMES[i]) return `The next usable segment must be ${NAMES[i]}; discharge preceding boundaries at waste.`;
  return null;
}
export function request(s: Machine, a: Action): Machine {
  const error = disabledReason(s, a);
  if (error) return { ...s, log: [...s.log, `Blocked: ${error}`].slice(-60) };
  const p = s.config;
  let steps: Step[] = []; let pos = s.position;
  const go = (target: Position, station: string) => { steps.push(...travel(pos, target, station, p)); pos = target; };
  const column = (col: number) => { for (let row = 0; row < DESIGN.rows; row++) { const d = dose(col,row,p); go(septumPosition(col,row,p), cellStation(d.index!,p)); steps.push(d); } };
  if (a === 'full' || a === 'load' || a === 'generate') { go(wastePosition(p), 'Waste'); steps.push(...loadSteps(p)); }
  if(a==='insertGas') steps.push(gasStep(p),{kind:'stop',name:'CLOSE GAS VALVE · gap retained in line',duration:.12});
  if(a==='transport'||a==='full') steps.push(transportStep());
  if (a === 'full') {
    for (let i = 0; i < p.count; i++) {
      column(i);
      if (i < p.count - 1) { go(wastePosition(p), 'Waste'); steps.push(...gapSteps(p)); }
    }
    go(parkPosition(p), 'Park'); steps.push(applyStep(p));
  } else if (['a','b','c'].includes(a)) column(['a','b','c'].indexOf(a));
  else if (a === 'gap') { go(wastePosition(p), 'Waste'); steps.push(...gapSteps(p)); }
  else if (a === 'park') go(parkPosition(p), 'Park');
  else if (a === 'waste') go(wastePosition(p), 'Waste');
  else if (a === 'apply') steps.push(applyStep(p));
  else if (a === 'off') steps.push({ kind: 'off', name: 'Switch all QRCE channels off', duration: .5 });
  else if (a === 'flush') steps.push({ kind: 'flush', name: 'Flush delivery tube & nozzle to waste', duration: 3 });
  return { ...s, queue: steps, elapsed: 0, paused: false, startPosition: s.position, log: [...s.log, `Started: ${a}`].slice(-60) };
}
function applyStep(p: Config): Step {
  return { kind: 'apply', name: `Apply ${ROWS[0]} ${p.e1.toFixed(2)} V · ${ROWS[1]} ${p.e2.toFixed(2)} V (${p.count * DESIGN.rows} independent channels)`, duration: 1 };
}
export function tick(s: Machine, dt: number): Machine {
  if (s.paused || !s.queue.length) return s;
  const step = s.queue[0], p = s.config;
  // Recheck physical interlocks at execution time, including automatic operations.
  const invalid = step.kind === 'apply' ? (s.station !== 'Park' ? 'Nozzle not parked.' : geometryCheck(p,s.fills).errors[0]) :
    step.kind === 'dispense' ? (s.outputs || s.station !== cellStation(step.index ?? 0, p) ? 'Dispense interlock.' : undefined) :
    (['waste','flush','load','gas','transport'].includes(step.kind)) && (s.station !== 'Waste'||s.outputs) ? 'Waste station / outputs-off interlock.' : undefined;
  if (invalid) return { ...s, queue: [], log: [...s.log, `Blocked: ${invalid}`].slice(-60) };
  const elapsed = Math.min(step.duration, s.elapsed + dt);
  const delta = elapsed - s.elapsed, progress = elapsed / step.duration;
  let next = { ...s, elapsed };
  if (step.kind === 'move' && step.target) next.position = s.startPosition.map((v,i) => v+(step.target![i]-v)*progress) as Position;
  if(step.kind==='transport') next.transport=progress;
  if (step.kind === 'dispense') {
    next.fills = s.fills.map((v,i) => i === step.index ? Math.min(p.volume,v+delta*p.flowRate) : v);
  }
  if (step.kind === 'dispense' || step.kind === 'waste') {
    next.segments = s.segments.map((seg,i) => i === 0 ? { ...seg, volume: Math.max(0,seg.volume-delta*p.flowRate) } : seg);
    if (step.kind === 'waste' && step.segment?.kind !== p.gas) next.wasteVolume += delta*p.flowRate;
  }
  if (elapsed >= step.duration - 1e-9) {
    if (step.kind === 'move') next.station = step.station!;
    if (step.kind === 'load'||step.kind==='gas') next.segments = [...s.segments,step.segment!];
    if(step.kind==='load'&&step.segment?.kind===NAMES[p.count-1]) next.loaded=true;
    if(step.kind==='gas') {
      const g=gasCalculation(p.gasControl);
      next.lastGasInjection={flow:p.gasControl.flow,seconds:step.duration,area:g.area,predicted:step.segment!.volume/g.area,pressure:p.gasControl.pressure};
    }
    if(step.kind==='transport') {next.transported=true;next.transport=1;}
    if (step.kind === 'waste' || (step.kind === 'dispense' && step.last)) next.segments = next.segments.slice(1);
    if (step.kind === 'dispense') { if (step.last) next.nextWell++; next.fills = next.fills.map((v,i) => i === step.index ? p.volume : v); }
    if (step.kind === 'apply') next.outputs = true;
    if (step.kind === 'off') next.outputs = false;
    if (step.kind === 'flush') { next.segments = []; next.loaded = false; next.transported=false;next.transport=0;next.wasteVolume += p.flowRate*3; }
    next.queue = s.queue.slice(1); next.elapsed = 0; next.startPosition = next.position;
    next.completed = [...s.completed,step.name].slice(-60);
    next.log = [...s.log,`${step.name} ✓`, ...(next.queue.length ? [] : ['Stopped. Flow off; anti-drip closed.'])].slice(-60);
  }
  return next;
}
export function status(s: Machine) {
  const step = s.queue[0]; const active = !!step && !s.paused;
  const gas = active && step.kind === 'gas';
  const flowing = active && ['load','gas','transport','dispense','waste','flush'].includes(step.kind);
  const selected = step?.kind === 'load'||step?.kind==='select' ? step.segment?.source ?? step.segment?.kind : step?.kind === 'dispense' ? `${NAMES[step.col!]} · solvent carrier` : ['flush','waste','transport'].includes(step?.kind??'') ? 'Solvent carrier' : 'None';
  return { selected: selected ?? 'None', gas, flowing, pump: flowing && !gas,
    dispensing: active && step?.kind === 'dispense', antiDrip: !flowing,
    outputs: step?.kind === 'apply' && active ? 'APPLYING' : step?.kind === 'off' && active ? 'SWITCHING OFF' : s.outputs ? 'ON' : 'OFF',
    station: step?.kind === 'move' ? `Moving → ${step.station}` : s.station };
}
