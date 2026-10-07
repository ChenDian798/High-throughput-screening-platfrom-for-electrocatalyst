import { Config, DEFAULTS, DESIGN, NAMES, geometryCheck, wellX } from './geometry';
import { gasCalculation, gasError } from './gas';
export type Position = [number, number, number];
export type Segment = { kind: string; volume: number; source?: string };
export type Step = { kind: 'move' | 'select' | 'stop' | 'gas' | 'transport' | 'load' | 'dispense' | 'waste' | 'lower' | 'raise' | 'flush'; name: string; duration: number; station?: string; target?: Position; index?: number; segment?: Segment };
export type GasInjection = { flow:number; seconds:number; area:number; predicted:number; pressure:number; measured?:number };
export type Machine = {
  config: Config; fills: number[]; segments: Segment[]; queue: Step[];
  elapsed: number; startPosition: Position; position: Position; station: string;
  lid: number; startLid: number; paused: boolean; loaded: boolean; nextWell: number;
  log: string[]; completed: string[]; wasteVolume: number;
  transported:boolean; transport:number; lastGasInjection:GasInjection|null;
};
export type Action = 'full' | 'load' | 'generate' | 'insertGas' | 'transport' | 'a' | 'b' | 'c' | 'gap' | 'park' | 'waste' | 'lower' | 'raise' | 'flush';
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'full', label: 'Run Full Sequence' }, { id: 'load', label: 'Load Segmented Train' },
  { id: 'a', label: 'Dispense A' }, { id: 'gap', label: 'Discharge Gas Gap to Waste' },
  { id: 'b', label: 'Dispense B' }, { id: 'c', label: 'Dispense C' },
  { id: 'park', label: 'Park Nozzle' }, { id: 'lower', label: 'Lower Electrode Lid' },
  { id: 'raise', label: 'Raise Electrode Lid' }, { id: 'flush', label: 'Flush Delivery Line' }
  ,{ id: 'waste', label: 'Move to Waste / Cleaning' }
];
export function wastePosition(p: Config): Position { return [-p.count * (p.width + 2) / 2 - 9, p.depth + 5, 0]; }
export function parkPosition(p: Config): Position { return [p.count * (p.width + 2) / 2 + 7, p.depth + 6, 9]; }
export function initial(config: Config = DEFAULTS): Machine {
  config={...config,gasVolume:gasCalculation(config.gasControl).volume};
  const position = wastePosition(config);
  return { config, fills: Array(config.count).fill(0), segments: [], queue: [], elapsed: 0,
    startPosition: position, position, station: 'Waste', lid: 1, startLid: 1, paused: false,
    loaded: false, nextWell: 0, log: ['Ready. Lid raised; outlet anti-drip closed.'], completed: [], wasteVolume: 0,
    transported:false,transport:0,lastGasInjection:null };
}
function move(target: Position, station: string, from: Position, p: Config): Step {
  return { kind: 'move', name: `Move to ${station}`, station, target, duration: Math.max(.2, Math.hypot(...target.map((v,i) => v - from[i])) / p.travelSpeed) };
}
function travel(from: Position, target: Position, station: string, p: Config): Step[] {
  const up: Position = [from[0], p.depth + 6, from[2]];
  const across: Position = [target[0], p.depth + 6, target[2]];
  return [move(up, 'Z clearance', from, p), move(across, 'Travel', up, p), move(target, station, across, p)];
}
function train(p: Config): Segment[] {
  return Array.from({ length: p.count }, (_, i) => [
    { kind: NAMES[i], volume: p.volume },
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
  const capacity=Math.max(s.config.count*s.config.volume+(s.config.count-1)*(s.config.gasVolume+2*DESIGN.boundaryVolume),total,1)*1.45;
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
function dose(i: number, p: Config): Step { return { kind: 'dispense', name: `Dispense ${NAMES[i]} → Well ${i + 1}`, index: i, duration: p.volume / p.flowRate }; }
export function disabledReason(s: Machine, a: Action): string | null {
  if (s.queue.length) return 'Finish or reset the active operation.';
  const p = s.config;
  if(['full','load','generate','insertGas'].includes(a)&&gasError(p.gasControl)) return gasError(p.gasControl);
  if (a === 'raise') return s.lid === 1 ? 'Lid is already raised.' : null;
  if (a === 'lower') {
    if (s.lid !== 1) return 'Lid is already clamped.';
    if (s.station !== 'Park') return 'Park the nozzle outside the closure envelope first.';
    return geometryCheck(p, s.fills).errors[0] ?? null;
  }
  if (s.lid !== 1) return 'Raise the lid before fluidic or robot operations.';
  if (a === 'park' || a === 'waste') return null;
  if (a === 'flush') return s.station !== 'Waste' ? 'Flush only at waste. Move to Waste / Cleaning first.' : null;
  if (a === 'insertGas') return s.station!=='Waste'?'Timed injection only at waste. Move to Waste / Cleaning first.':s.loaded?'Flush or reset the prepared train before a calibration injection.':null;
  if (a === 'transport') return !s.loaded?'Generate the liquid–gas train first.':s.transported?'Train is already at the delivery outlet.':s.station!=='Waste'?'Transport setup requires the nozzle at waste.':null;
  if (a === 'full' || a === 'load' || a === 'generate') {
    if (s.loaded || s.segments.length || s.fills.some(v => v > 0)) return 'Reset the visualization before preparing a new train.';
    return geometryCheck(p, Array(p.count).fill(p.volume)).errors[0] ?? null;
  }
  if (a === 'gap') return s.segments[0]?.kind === 'boundary' ? null : 'No separating gas/boundary group is next at the outlet.';
  const i = ['a','b','c'].indexOf(a);
  if(!s.transported) return 'Press Transport Train before dispensing the prepared train.';
  if (i >= p.count) return 'This well is not active.';
  if (!s.loaded || s.nextWell !== i || s.segments[0]?.kind !== NAMES[i]) return `The next usable segment must be ${NAMES[i]}; discharge preceding boundaries at waste.`;
  return null;
}
export function request(s: Machine, a: Action): Machine {
  const error = disabledReason(s, a);
  if (error) return { ...s, log: [...s.log, `Blocked: ${error}`].slice(-60) };
  const p = s.config;
  let steps: Step[] = []; let pos = s.position;
  const go = (target: Position, station: string) => { steps.push(...travel(pos, target, station, p)); pos = target; };
  if (a === 'full' || a === 'load' || a === 'generate') { go(wastePosition(p), 'Waste'); steps.push(...loadSteps(p)); }
  if(a==='insertGas') steps.push(gasStep(p),{kind:'stop',name:'CLOSE GAS VALVE · gap retained in line',duration:.12});
  if(a==='transport'||a==='full') steps.push(transportStep());
  if (a === 'full') {
    for (let i = 0; i < p.count; i++) {
      go([wellX(i,p), p.depth + 3, 0], `Well ${i+1}`); steps.push(dose(i,p));
      if (i < p.count - 1) { go(wastePosition(p), 'Waste'); steps.push(...gapSteps(p)); }
    }
    go(parkPosition(p), 'Park'); steps.push({ kind: 'lower', name: 'Lower, align & clamp lid', duration: 2.5 });
  } else if (['a','b','c'].includes(a)) {
    const i = ['a','b','c'].indexOf(a); go([wellX(i,p), p.depth+3,0], `Well ${i+1}`); steps.push(dose(i,p));
  } else if (a === 'gap') { go(wastePosition(p), 'Waste'); steps.push(...gapSteps(p)); }
  else if (a === 'park') go(parkPosition(p), 'Park');
  else if (a === 'waste') go(wastePosition(p), 'Waste');
  else if (a === 'lower' || a === 'raise') steps.push({ kind: a, name: a === 'lower' ? 'Lower, align & clamp lid' : 'Raise guided lid', duration: 2.5 });
  else if (a === 'flush') steps.push({ kind: 'flush', name: 'Flush delivery tube & nozzle to waste', duration: 3 });
  return { ...s, queue: steps, elapsed: 0, paused: false, startPosition: s.position, startLid: s.lid, log: [...s.log, `Started: ${a}`].slice(-60) };
}
export function tick(s: Machine, dt: number): Machine {
  if (s.paused || !s.queue.length) return s;
  const step = s.queue[0], p = s.config;
  // Recheck physical interlocks at execution time, including automatic operations.
  const invalid = step.kind === 'lower' ? (s.station !== 'Park' ? 'Nozzle not parked.' : geometryCheck(p,s.fills).errors[0]) :
    step.kind === 'dispense' ? (s.lid !== 1 || s.station !== `Well ${(step.index ?? 0)+1}` ? 'Dispense interlock.' : undefined) :
    (['waste','flush','load','gas','transport'].includes(step.kind)) && (s.station !== 'Waste'||s.lid!==1) ? 'Waste station / raised lid interlock.' : undefined;
  if (invalid) return { ...s, queue: [], log: [...s.log, `Blocked: ${invalid}`].slice(-60) };
  const elapsed = Math.min(step.duration, s.elapsed + dt);
  const delta = elapsed - s.elapsed, progress = elapsed / step.duration;
  let next = { ...s, elapsed };
  if (step.kind === 'move' && step.target) next.position = s.startPosition.map((v,i) => v+(step.target![i]-v)*progress) as Position;
  if (step.kind === 'lower') next.lid = s.startLid * (1-progress);
  if (step.kind === 'raise') next.lid = s.startLid + (1-s.startLid)*progress;
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
    if (step.kind === 'dispense' || step.kind === 'waste') next.segments = next.segments.slice(1);
    if (step.kind === 'dispense') { next.nextWell++; next.fills = next.fills.map((v,i) => i === step.index ? p.volume : v); }
    if (step.kind === 'lower') next.lid = 0;
    if (step.kind === 'raise') next.lid = 1;
    if (step.kind === 'flush') { next.segments = []; next.loaded = false; next.transported=false;next.transport=0;next.wasteVolume += p.flowRate*3; }
    next.queue = s.queue.slice(1); next.elapsed = 0; next.startPosition = next.position; next.startLid = next.lid;
    next.completed = [...s.completed,step.name].slice(-60);
    next.log = [...s.log,`${step.name} ✓`, ...(next.queue.length ? [] : ['Stopped. Flow off; anti-drip closed.'])].slice(-60);
  }
  return next;
}
export function status(s: Machine) {
  const step = s.queue[0]; const active = !!step && !s.paused;
  const gas = active && step.kind === 'gas';
  const flowing = active && ['load','gas','transport','dispense','waste','flush'].includes(step.kind);
  const selected = step?.kind === 'load'||step?.kind==='select' ? step.segment?.source ?? step.segment?.kind : step?.kind === 'dispense' ? `${NAMES[step.index!]} · solvent carrier` : ['flush','waste','transport'].includes(step?.kind??'') ? 'Solvent carrier' : 'None';
  return { selected: selected ?? 'None', gas, flowing, pump: flowing && !gas,
    dispensing: active && step?.kind === 'dispense', antiDrip: !flowing,
    lid: s.lid === 1 ? 'RAISED' : s.lid === 0 ? 'CLAMPED' : step?.kind === 'raise' ? 'RAISING' : 'LOWERING',
    station: step?.kind === 'move' ? `Moving → ${step.station}` : s.station };
}
