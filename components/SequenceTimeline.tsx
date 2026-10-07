import { Machine } from '@/lib/machine';
const stages=[['Prepare','load'],['Load A','A →'],['Waste gap','Waste'],['Load B','B →'],['Waste gap','Waste'],['Load C','C →'],['Park','Park'],['Clamp lid','clamp']];
export default function SequenceTimeline({ machine }: { machine:Machine }) {
  const step=machine.queue[0];
  const done=(i:number)=>i===0?machine.loaded:i===1?machine.fills[0]>=machine.config.volume:i===2?machine.nextWell>=2 || (machine.nextWell===1&&machine.segments[0]?.kind==='B'):i===3?machine.nextWell>=2:i===4?machine.nextWell>=3 || (machine.nextWell===2&&machine.segments[0]?.kind==='C'):i===5?machine.nextWell>=3:i===6?machine.station==='Park':machine.lid===0;
  const active=(i:number)=>i===0?step?.kind==='load':i===1?step?.kind==='dispense'&&step.index===0:i===2?step?.kind==='waste'&&machine.nextWell===1:i===3?step?.kind==='dispense'&&step.index===1:i===4?step?.kind==='waste'&&machine.nextWell===2:i===5?step?.kind==='dispense'&&step.index===2:i===6?step?.kind==='move'&&step.station==='Park':step?.kind==='lower';
  return <section className="panel sequence">
    <div className="panel-heading"><h2><span className="section-number">04</span> Synchronized loading sequence</h2><span className="micro">CONTACT ONLY · NO REACTION SIMULATION</span></div>
    <ol className="timeline">{stages.map(([name],i)=><li key={i} className={`${done(i)?'done':''} ${active(i)?'active':''} ${(machine.config.count<3&&i===5)||(machine.config.count<2&&i===3)||(machine.config.count<3&&i===4)||(machine.config.count<2&&i===2)?'inactive':''}`}><span>{done(i)?'✓':String(i+1).padStart(2,'0')}</span><b>{name}</b></li>)}</ol>
    {step&&<div className="sequence-progress"><i style={{width:`${machine.elapsed/step.duration*100}%`}}/></div>}
    <div className="log-block"><div><h3>Instrument log</h3><p className="footnote">One deterministic clock drives the scene, schematic, volumes and interlocks.</p></div><ol aria-live="polite">{machine.log.slice(-5).map((line,i)=><li key={`${machine.log.length}-${i}`}><span>{String(Math.max(0,machine.log.length-5)+i+1).padStart(2,'0')}</span>{line}</li>)}</ol></div>
  </section>;
}
