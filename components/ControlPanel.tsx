'use client';
import { ACTIONS, Action, Machine, disabledReason, status } from '@/lib/machine';
import { geometryCheck } from '@/lib/geometry';
export default function ControlPanel({ machine,act,pause,reset }: { machine:Machine;act:(action:Action)=>void;pause:()=>void;reset:()=>void }) {
  const st=status(machine),check=geometryCheck(machine.config,machine.fills);
  return <div className="control-panel">
    <div className="control-intro"><span className={`status-dot ${machine.queue.length&&!machine.paused?'live':''}`}/><b>{machine.paused?'Sequence paused':machine.queue[0]?.name??(machine.lid===0?'Contact established · sequence complete':'Ready for loading')}</b><span className="micro">IDEALIZED · {8}× TIME</span></div>
    <button className="primary run" disabled={!!disabledReason(machine,'full')} title={disabledReason(machine,'full')??''} onClick={()=>act('full')}><span>▶</span> Run Full Sequence <span>→</span></button>
    <div className="button-grid">{ACTIONS.filter(a=>a.id!=='full').map(a=><button key={a.id} disabled={!!disabledReason(machine,a.id)} title={disabledReason(machine,a.id)??a.label} onClick={()=>act(a.id)}>{a.label}</button>)}</div>
    <div className="button-grid secondary-actions"><button onClick={pause} disabled={!machine.queue.length}>{machine.paused?'▶ Resume':'Ⅱ Pause'}</button><button onClick={reset}>↺ Reset visualization</button></div>
    <p className="footnote">Disabled controls expose their interlock reason on hover. Flush cleans the delivery tube and nozzle only. Reset is a visualization reset, not physical cleaning.</p>
    <h3>Live instrument state</h3>
    <dl className="status-grid">
      {[
        ['Selected precursor',st.selected],['Dosing pump',st.pump?'ON':'OFF'],['Gas valve',st.gas?'OPEN':'CLOSED'],['Flow',st.flowing?'MOVING':'STOPPED'],['Robot station',st.station],['Nozzle',st.dispensing?'DISPENSING':'PAUSED'],['Anti-drip outlet',st.antiDrip?'CLOSED':'OPEN'],['Lid',st.lid],['Upper electrode',machine.lid===0&&check.errors.length===0?'IMMERSED':'NOT IMMERSED'],['Minimum bottom clearance',`${(machine.config.clearance+machine.lid*(machine.config.depth+11)).toFixed(2)} mm`]
      ].map(([key,value])=><div key={key}><dt>{key}</dt><dd className={['ON','MOVING','DISPENSING','IMMERSED'].includes(value)?'on':''}>{value}</dd></div>)}
    </dl>
    <div className="well-readings">{machine.fills.map((v,i)=><div key={i}><span>Well {i+1}</span><b>{v.toFixed(1)} <small>μL</small></b><div className="fill-track"><i style={{width:`${Math.min(100,v/machine.config.volume*100)}%`,background:['#0072b2','#d55e00','#009e73'][i]}}/></div></div>)}</div>
  </div>;
}
