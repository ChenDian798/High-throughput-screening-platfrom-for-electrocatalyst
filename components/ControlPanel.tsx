'use client';
import { ACTIONS, Action, Machine, disabledReason, status } from '@/lib/machine';
import { COLORS, cells, geometryCheck, rowPotential } from '@/lib/geometry';
export default function ControlPanel({ machine,act,pause,reset }: { machine:Machine;act:(action:Action)=>void;pause:()=>void;reset:()=>void }) {
  const st=status(machine),p=machine.config,check=geometryCheck(p,machine.fills);
  return <div className="control-panel">
    <div className="control-intro"><span className={`status-dot ${machine.queue.length&&!machine.paused?'live':''}`}/><b>{machine.paused?'Sequence paused':machine.queue[0]?.name??(machine.outputs?'Row potentials applied · sequence complete':'Ready for loading')}</b><span className="micro">IDEALIZED · LIQUID / ROBOT 8× · TIMED GAS 1×</span></div>
    <button className="primary run" disabled={!!disabledReason(machine,'full')} title={disabledReason(machine,'full')??''} onClick={()=>act('full')}><span>▶</span> Run Full Sequence <span>→</span></button>
    <div className="button-grid">{ACTIONS.filter(a=>a.id!=='full').map(a=><button key={a.id} disabled={!!disabledReason(machine,a.id)} title={disabledReason(machine,a.id)??a.label} onClick={()=>act(a.id)}>{a.label}</button>)}</div>
    <button className="transport-button" disabled={!!disabledReason(machine,'transport')} title={disabledReason(machine,'transport')??''} onClick={()=>act('transport')}>Transport Train</button>
    <div className="button-grid secondary-actions"><button onClick={pause} disabled={!machine.queue.length}>{machine.paused?'▶ Resume':'Ⅱ Pause'}</button><button onClick={reset}>↺ Reset visualization</button></div>
    <p className="footnote">Load Segmented Train generates the train; Transport Train then advances it to the outlet. Run Full Sequence performs both, fills R1 and R2 of each column through their septa, parks, then applies the row potentials. Flush cleans the delivery tube and nozzle only. Reset is a visualization reset, not physical cleaning.</p>
    <h3>Live instrument state</h3>
    <dl className="status-grid">
      {[
        ['Selected precursor',st.selected],['Dosing pump',st.pump?'ON':'OFF'],['Gas valve',st.gas?'OPEN':'CLOSED'],['Flow',st.flowing?'MOVING':'STOPPED'],['Robot station',st.station],['Nozzle',st.dispensing?'DISPENSING':'PAUSED'],['Anti-drip outlet',st.antiDrip?'CLOSED':'OPEN'],['Cell outputs',st.outputs],['QRCEs',check.errors.length===0?'IMMERSED':'NOT IMMERSED'],['Row potentials',`${p.e1.toFixed(2)} V / ${p.e2.toFixed(2)} V`]
      ].map(([key,value])=><div key={key}><dt>{key}</dt><dd className={['ON','MOVING','DISPENSING','IMMERSED'].includes(value)?'on':''}>{value}</dd></div>)}
    </dl>
    <div className="well-readings">{[0,1].flatMap(row=>cells(p).filter(c=>c.row===row)).map(c=><div key={c.index}><span>{c.name} · {rowPotential(c.row,p).toFixed(2)} V</span><b>{machine.fills[c.index].toFixed(1)} <small>μL</small></b><div className="fill-track"><i style={{width:`${Math.min(100,machine.fills[c.index]/p.volume*100)}%`,background:COLORS[c.col]}}/></div></div>)}</div>
  </div>;
}
