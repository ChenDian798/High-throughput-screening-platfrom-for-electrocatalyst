'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { COLORS, DESIGN, NAMES, segmentLength } from '@/lib/geometry';
import { Machine, status } from '@/lib/machine';
const FluidicModel=dynamic(()=>import('./FluidicModel'),{ssr:false,loading:()=> <div className="scene-loading">Initializing delivery hardware…</div>});

export function ReservoirBank({ selected }: { selected: string }) {
  return <g>{[...NAMES, 'Solvent'].map((name,i) => <g key={name}>
    <path d={`M ${30+i*92} 55 V 101 Q ${30+i*92} 111 ${40+i*92} 111 H ${77+i*92} Q ${87+i*92} 111 ${87+i*92} 101 V 55 Z`} fill={i<3 ? COLORS[i]+'18' : '#eef2f5'} stroke={selected === name || (i===3&&selected.toLowerCase().includes('carrier')) ? '#007b79' : '#95a3af'} strokeWidth={selected === name || (i===3&&selected.toLowerCase().includes('carrier')) ? 2.5 : 1.2}/>
    <rect x={38+i*92} y={76} width={41} height={27} rx={3} fill={i<3 ? COLORS[i] : '#a7b4c2'} opacity={.6}/>
    <text x={59+i*92} y={42} textAnchor="middle">{i<3 ? `Precursor ${name}` : name}</text>
    <path d={`M ${59+i*92} 111 V ${122+i*4} H 422 V 144`} fill="none" stroke={i<3 ? COLORS[i] : '#a7b4c2'} strokeWidth={1.5}/>
  </g>)}</g>;
}
export function GasInjectionModule({ gas, open }: { gas: string; open: boolean }) {
  return <g>
    <rect x={554} y={29} width={46} height={61} rx={10} fill="#eff3f5" stroke="#8d9aa6"/>
    <text x={577} y={65} textAnchor="middle">{gas}</text>
    <path d="M 600 59 H 635 H 671 V 163" fill="none" stroke={open ? '#007b79' : '#8d9aa6'} strokeWidth={2}/>
    <circle cx={628} cy={59} r={12} fill="white" stroke="#8d9aa6"/><path d="M 622 64 L 634 53" stroke="#536675"/>
    <path d="M 662 96 L 680 110 L 680 96 L 662 110 Z" fill={open ? '#007b79' : '#fff'} stroke="#536675"/>
    <text x={620} y={24}>Regulator</text><text x={690} y={102}>{open ? 'Gas OPEN' : 'Gas CLOSED'}</text>
  </g>;
}
export default function FluidicSchematic({ machine }: { machine: Machine }) {
  const [mode,setMode]=useState<'3d'|'2d'>('3d');
  const [camera,setCamera]=useState<'iso'|'top'|'side'>('iso');
  const [labels,setLabels]=useState(true);
  const st = status(machine), p = machine.config;
  const capacity = p.count*p.volume+(p.count-1)*(p.gasVolume+2*DESIGN.boundaryVolume);
  let cursor = 1024;
  const incoming = machine.queue[0]?.kind === 'load' ? machine.queue[0].segment : null;
  const segments = incoming ? [...machine.segments, { ...incoming, volume: incoming.volume * machine.elapsed / machine.queue[0].duration }] : machine.segments;
  return <section className="schematic panel">
    <div className="panel-heading"><h2><span className="section-number">02</span> Single-line delivery</h2><span className="micro">ONE COMMON TUBE · Ø {DESIGN.tubeID} mm ID</span></div>
    <div className="model-toolbar delivery-toolbar">
      <div className="segmented"><button className={mode==='3d'?'selected':''} aria-pressed={mode==='3d'} onClick={()=>setMode('3d')}>3D delivery model</button><button className={mode==='2d'?'selected':''} aria-pressed={mode==='2d'} onClick={()=>setMode('2d')}>2D schematic</button></div>
      {mode==='3d'&&<><div className="segmented">{(['iso','top','side'] as const).map(c=><button key={c} className={camera===c?'selected':''} onClick={()=>setCamera(c)}>{c==='iso'?'Delivery isometric':c==='top'?'Delivery top':'Delivery side'}</button>)}</div><label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>Delivery labels</label></>}
    </div>
    {mode==='3d'?<div className="delivery-canvas"><FluidicModel machine={machine} camera={camera} labels={labels}/><div className="scene-hint">Drag to orbit · scroll to zoom · right-drag to pan · schematic, not to scale</div></div>:<div className="svg-scroll"><svg viewBox="0 0 1120 246" role="img" aria-label="Reservoirs to selector, dosing pump, controlled gas junction and one common tube to the nozzle">
      <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#66798a"/></marker></defs>
      <ReservoirBank selected={st.selected}/><GasInjectionModule gas={p.gas} open={st.gas}/>
      <path d="M 422 163 H 1036 V 192" fill="none" stroke="#a8b7c4" strokeWidth={3} markerEnd="url(#arrow)"/>
      <circle cx={422} cy={163} r={19} fill="white" stroke="#607989" strokeWidth={1.5}/><path d="M411 163L431 153M422 163L432 173" stroke="#607989" strokeWidth={2}/>
      <text x={422} y={204} textAnchor="middle">Selector</text>
      <rect x={490} y={145} width={62} height={36} rx={5} fill={st.pump ? '#d7eeeb' : 'white'} stroke="#607989"/><path d="M501 163H540M526 152V174" stroke="#607989" strokeWidth={2}/>
      <text x={521} y={204} textAnchor="middle">Dosing pump</text>
      <circle cx={671} cy={163} r={8} fill={st.gas ? '#007b79' : '#fff'} stroke="#607989"/><text x={671} y={204} textAnchor="middle">Phase-switch junction</text>
      <rect x={721} y={153} width={303} height={20} rx={9} fill="#f3f6f8" stroke="#a8b7c4"/>
      {segments.map((seg,i) => {
        const width = 303*seg.volume/Math.max(1,capacity); cursor -= width;
        const index = NAMES.indexOf(seg.kind); const gas = seg.kind === p.gas;
        return <g key={i}><rect x={cursor} y={156} width={Math.max(0,width)} height={14} rx={2} fill={index>=0 ? COLORS[index] : gas ? '#b6c0c980' : '#c4ae91'}/>{width>17 && <text x={cursor+width/2} y={167} textAnchor="middle" fill={index>=0 ? 'white' : '#34495e'} fontSize={9}>{seg.kind === 'boundary' ? 'b' : seg.kind}</text>}</g>;
      })}
      <text x={870} y={140} textAnchor="middle">Common tube → outlet · A nearest nozzle</text>
      <path d="M1030 182H1042L1039 198H1033Z" fill="#728592"/><text x={1054} y={197}>Nozzle</text>
      <path d="M1036 201V216" stroke={st.flowing ? '#007b79' : '#b8c2ca'} strokeDasharray="3 3"/>
      <rect x={1010} y={220} width={52} height={14} rx={3} fill="#e6ecef" stroke="#8d9aa6"/><text x={990} y={232} textAnchor="end">{machine.queue[0]?.kind==='move'?'Travel · flow stopped':machine.station==='Park'?'Safe park':machine.station.startsWith('Well') ? machine.station : 'Waste / cleaning'}</text>
    </svg></div>}
    <div className="delivery-state"><span>Selector: <b>{st.selected}</b></span><span>Pump: <b>{st.pump?'ON':'OFF'}</b></span><span>Gas valve: <b>{st.gas?'OPEN':'CLOSED'}</b></span><span>Flow: <b>{st.flowing?'MOVING':'STOPPED'}</b></span><span>Nozzle: <b>{st.station}</b></span></div>
    <div className="schematic-foot"><span>Loading order: <b>{NAMES.slice(0,p.count).join(` → ${p.gas} gap → `)}</b> · boundaries to waste</span><span>{segmentLength(p.volume).toFixed(1)} mm / liquid slug · {segmentLength(p.gasVolume).toFixed(1)} mm / gas gap</span></div>
    <p className="footnote">In 2D, the outlet is at right and the train reads in delivery order from right to left. In 3D, the first segment is nearest the nozzle. Separate reservoir feeds end at the selector; only ONE common tube reaches the nozzle. The waste drain connects the cleaning station to a separate waste reservoir; Safe park is not a waste station. Hardware and tube paths are schematic, not to scale. Gas appears only during controlled phase switching. Real operation requires segment detection and calibration.</p>
  </section>;
}
