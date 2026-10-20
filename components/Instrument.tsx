'use client';
import dynamic from 'next/dynamic';
import { useEffect, useReducer, useState } from 'react';
import { Config, DEFAULTS, DESIGN, geometryCheck } from '@/lib/geometry';
import { Action, Machine, calibrate, initial, request, status, tick } from '@/lib/machine';
import GasGapControl from './GasGapControl';
import type { ViewSettings } from './Scene';
import FluidicSchematic from './FluidicSchematic';
import CombinedOverview from './CombinedOverview';
import ControlPanel from './ControlPanel';
import ParameterPanel from './ParameterPanel';
import DesignExplanationPanel from './DesignExplanationPanel';
import SequenceTimeline from './SequenceTimeline';
const Scene=dynamic(()=>import('./Scene'),{ssr:false,loading:()=> <div className="scene-loading">Initializing instrument geometry…</div>});
type Event={type:'tick';dt:number}|{type:'action';action:Action}|{type:'pause'}|{type:'reset'}|{type:'config';config:Config}|{type:'calibrate';measured:number};
function reducer(s:Machine,e:Event):Machine {
  if(e.type==='tick') return tick(s,e.dt*(s.queue[0]?.kind==='gas'?1:DESIGN.timeScale));
  if(e.type==='calibrate') return calibrate(s,e.measured);
  if(e.type==='action') return request(s,e.action);
  if(e.type==='pause') return {...s,paused:!s.paused,log:[...s.log,s.paused?'Resumed synchronized clock.':'Paused. Flow stopped; anti-drip closed.'].slice(-60)};
  if(e.type==='config') return initial(e.config);
  return initial(s.config);
}
export default function Instrument() {
  const [machine,dispatch]=useReducer(reducer,DEFAULTS,initial);
  const [tab,setTab]=useState('Operate');
  const [presentation,setPresentation]=useState(false);
  const [view,setView]=useState<ViewSettings>({camera:'iso',exploded:false,caps:true,frame:true,opacity:.55,section:false,labels:true,dimensions:false});
  const active=machine.queue.length>0&&!machine.paused;
  useEffect(()=>{
    if(!active) return;
    let frame=0,last=performance.now();
    const advance=(now:number)=>{dispatch({type:'tick',dt:Math.min(.1,(now-last)/1000)});last=now;frame=requestAnimationFrame(advance);};
    frame=requestAnimationFrame(advance); return ()=>cancelAnimationFrame(frame);
  },[active]);
  const st=status(machine),check=geometryCheck(machine.config,machine.fills);
  const targetCheck=geometryCheck(machine.config,Array(machine.config.count*DESIGN.rows).fill(machine.config.volume));
  const changeView=(part:Partial<ViewSettings>)=>setView(v=>({...v,...part}));
  return <main className={presentation?'instrument presentation':'instrument'}>
    <header className="header"><div className="brand-mark"><span/><span/><span/></div><div className="brand">REACTOR LAB <span>CONCEPT INSTRUMENT / 01</span></div><button className="presentation-button" onClick={()=>setPresentation(p=>!p)}>{presentation?'Exit presentation':'↗ Presentation mode'}</button></header>
    <div className="title-row"><div><p className="eyebrow">ROBOTIC FLUID HANDLING / LEGION-STYLE CELL ARRAY</p><h1>Robotic Single-Line Loading<br/><span>& Sealed Legion Cell Array</span></h1><p className="subtitle">One delivery line. Six sealed cells in 2 rows × 3. One independent potentiostat channel per cell.</p></div><div className="prototype-badge"><span className="status-dot"/> CONCEPTUAL PROTOTYPE <small>MECHANICAL + FLUIDIC VISUALIZATION</small></div></div>
    <div className="notice">Conceptual prototype — fluid delivery, sealing, electrode geometry and electrochemical performance require experimental validation.</div>
    <div className="workspace">
      <section className="panel model-panel">
        <div className="panel-heading"><h2><span className="section-number">01</span> Instrument workspace</h2><span className={`state-pill ${active?'running':''}`}>{machine.paused?'PAUSED':active?'SEQUENCE RUNNING':machine.outputs?'POTENTIALS APPLIED':'STANDBY'}</span></div>
        <div className="model-toolbar"><div className="segmented">{(['iso','top','side'] as const).map(c=><button key={c} className={view.camera===c?'selected':''} onClick={()=>changeView({camera:c})}>{c==='iso'?'Isometric':c==='top'?'Top':'Side'}</button>)}</div><div className="segmented"><button className={!view.exploded?'selected':''} onClick={()=>changeView({exploded:false})}>Assembled</button><button className={view.exploded?'selected':''} onClick={()=>changeView({exploded:true})}>Exploded</button></div><button className={view.section?'selected':''} onClick={()=>changeView({section:!view.section})}>Cross-section</button></div>
        <div className="model-canvas"><Scene machine={machine} view={view}/>
          <div className="scene-key"><b>FORMULATIONS</b><span><i style={{background:'#0072b2'}}/> A / column 1</span><span><i style={{background:'#d55e00'}}/> B / column 2</span><span><i style={{background:'#009e73'}}/> C / column 3</span><span>R1 {machine.config.e1.toFixed(2)} V · R2 {machine.config.e2.toFixed(2)} V</span><span><i style={{background:'#bdc6ce'}}/> {machine.config.gas} gap</span></div>
          <div className="scene-hint">Drag to orbit · scroll to zoom · right-drag to pan</div>
          {view.exploded&&<div className="view-notice">Exploded inspection · offsets are visual only</div>}
          {view.section&&<div className="section-notice">Cut through R2 cell centers · front removed</div>}
        </div>
        <div className="view-controls">
          {(['caps','frame','labels','dimensions'] as const).map(key=><label key={key}><input type="checkbox" checked={view[key]} onChange={e=>changeView({[key]:e.target.checked})}/>{key==='caps'?'Caps + QRCEs':key==='frame'?'Show cell block':key==='labels'?'Labels':'Dimensions'}</label>)}
          <label className="opacity">Block / WE opacity <input type="range" aria-label="Electrode opacity" min={.15} max={1} step={.05} value={view.opacity} onChange={e=>changeView({opacity:Number(e.target.value)})}/><span>{Math.round(view.opacity*100)}%</span></label>
        </div>
        <p className="model-note">Gantry and flexible service loop are schematic, not to scale. Transparency is a visualization aid; PEEK and glassy carbon are opaque. Inspection views do not change the physical controller state.</p>
        <div className="contact-strip"><div><span>FLUIDIC ISOLATION</span><b>Gasket-sealed bores · septum cap per cell</b></div><div><span>ELECTRICAL CONNECTION</span><b>Common GC WE + {machine.config.count*DESIGN.rows} independent QRCE channels</b></div><div><span>QRCE IMMERSION / HEADSPACE</span><b>{check.errors.length?'Await valid fills':`${check.immersion.toFixed(2)} mm / ${check.headspace.toFixed(2)} mm`}</b></div></div>
      </section>
      <aside className="panel sidebar"><div className="tabs" role="tablist" aria-label="Instrument panels">{['Operate','Parameters','Design notes'].map(t=><button role="tab" aria-selected={tab===t} className={tab===t?'selected':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="sidebar-content" role="tabpanel">
        {tab==='Operate'?<ControlPanel machine={machine} act={action=>dispatch({type:'action',action})} pause={()=>dispatch({type:'pause'})} reset={()=>dispatch({type:'reset'})}/>:tab==='Parameters'?<ParameterPanel config={machine.config} locked={machine.queue.length>0||machine.segments.length>0||machine.loaded||machine.fills.some(v=>v>0)||machine.outputs} change={config=>dispatch({type:'config',config})}/>:<DesignExplanationPanel/>}
      </div></aside>
    </div>
    {targetCheck.errors.length>0&&<div className="geometry-alert" role="alert"><b>Geometry warning · loading / potentials blocked</b> {targetCheck.errors.join(' ')}</div>}
    <FluidicSchematic machine={machine}/><GasGapControl machine={machine} act={action=>dispatch({type:'action',action})} change={config=>dispatch({type:'config',config})} calibration={measured=>dispatch({type:'calibrate',measured})} pause={()=>dispatch({type:'pause'})} reset={()=>dispatch({type:'reset'})}/><CombinedOverview machine={machine}/><SequenceTimeline machine={machine}/>
    <footer><p><b>Cell array after Legion (Gerroll, Kulesa, Ault &amp; Baker, ACS Meas. Sci. Au 2023).</b><br/>Each cell's QRCE has its own channel: potential set and current measured per cell against a common glassy-carbon WE.</p><p>Idealized synchronized sequence. Real operation requires calibration and segment tracking;<br/>the animation is not a validated control algorithm. No electrochemical reaction is simulated.</p></footer>
    <span className="sr-only">Flow {st.flowing?'MOVING':'STOPPED'}</span>
  </main>;
}
