'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Machine, status } from '@/lib/machine';
import type { ViewSettings } from './Scene';
const Scene=dynamic(()=>import('./Scene'),{ssr:false,loading:()=> <div className="scene-loading">Initializing combined instrument…</div>});

export default function CombinedOverview({ machine }: { machine:Machine }) {
  const [camera,setCamera]=useState<ViewSettings['camera']>('iso');
  const [labels,setLabels]=useState(true);
  const view:ViewSettings={camera,labels,exploded:false,caps:true,frame:true,opacity:.55,section:false,dimensions:false};
  const st=status(machine);
  return <section className="panel schematic combined-overview">
    <div className="panel-heading"><h2><span className="section-number">03</span> Combined instrument overview</h2><span className="micro">DELIVERY + ROBOT + LEGION CELL ARRAY</span></div>
    <div className="model-toolbar delivery-toolbar"><div className="segmented">{(['iso','top','side'] as const).map(c=><button key={c} className={camera===c?'selected':''} onClick={()=>setCamera(c)}>{c==='iso'?'Overview isometric':c==='top'?'Overview top':'Overview side'}</button>)}</div><label><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>Overview labels</label></div>
    <div className="delivery-canvas"><Scene machine={machine} view={view} combined/><div className="scene-hint">Drag to orbit · scroll to zoom · right-drag to pan · schematic, not to scale</div></div>
    <div className="delivery-state"><span>Flow: <b>{st.flowing?'MOVING':'STOPPED'}</b></span><span>Nozzle: <b>{st.station}</b></span><span>Cell outputs: <b>{st.outputs}</b></span></div>
    <p className="footnote">Separate overview of the assembled system. Sections 01 and 02 focus on the robot/cell-array assembly and delivery subsystem respectively. All three views share the same sequence, nozzle position and liquid volumes.</p>
  </section>;
}
