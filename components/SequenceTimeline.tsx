import { Machine } from '@/lib/machine';
import { DESIGN, NAMES, cellIndex } from '@/lib/geometry';
// Stage columns: prepare, then per formulation "fill R1+R2" with a waste gap between, then park and apply potentials.
type Stage = { name: string; col?: number; gapBefore?: number; kind: 'prepare'|'fill'|'gap'|'park'|'apply' };
const stages: Stage[] = [{name:'Prepare',kind:'prepare'},...NAMES.flatMap((n,col)=>[...(col?[{name:'Waste gap',kind:'gap' as const,gapBefore:col}]:[]),{name:`Fill ${n} · R1+R2`,kind:'fill' as const,col}]),{name:'Park',kind:'park'},{name:'Apply E₁ / E₂',kind:'apply'}];
export default function SequenceTimeline({ machine }: { machine:Machine }) {
  const step=machine.queue[0],p=machine.config;
  const filled=(col:number)=>Array.from({length:DESIGN.rows},(_,row)=>machine.fills[cellIndex(col,row)]??0).every(v=>v>=p.volume);
  const done=(s:Stage)=>s.kind==='prepare'?machine.loaded||machine.fills.some(v=>v>0):s.kind==='fill'?filled(s.col!):s.kind==='gap'?machine.nextWell>s.gapBefore! || (machine.nextWell===s.gapBefore&&machine.segments[0]?.kind===NAMES[s.gapBefore!]):s.kind==='park'?machine.station==='Park':machine.outputs;
  const active=(s:Stage)=>s.kind==='prepare'?step?.kind==='load':s.kind==='fill'?step?.kind==='dispense'&&step.col===s.col:s.kind==='gap'?step?.kind==='waste'&&machine.nextWell===s.gapBefore:s.kind==='park'?step?.kind==='move'&&step.station==='Park':step?.kind==='apply';
  const inactive=(s:Stage)=>(s.col!==undefined&&s.col>=p.count)||(s.gapBefore!==undefined&&s.gapBefore>=p.count);
  return <section className="panel sequence">
    <div className="panel-heading"><h2><span className="section-number">04</span> Synchronized loading sequence</h2><span className="micro">ROW POTENTIALS · NO REACTION SIMULATION</span></div>
    <ol className="timeline">{stages.map((s,i)=><li key={i} className={`${done(s)?'done':''} ${active(s)?'active':''} ${inactive(s)?'inactive':''}`}><span>{done(s)?'✓':String(i+1).padStart(2,'0')}</span><b>{s.name}</b></li>)}</ol>
    {step&&<div className="sequence-progress"><i style={{width:`${machine.elapsed/step.duration*100}%`}}/></div>}
    <div className="log-block"><div><h3>Instrument log</h3><p className="footnote">One deterministic clock drives the scene, schematic, volumes and interlocks.</p></div><ol aria-live="polite">{machine.log.slice(-5).map((line,i)=><li key={`${machine.log.length}-${i}`}><span>{String(Math.max(0,machine.log.length-5)+i+1).padStart(2,'0')}</span>{line}</li>)}</ol></div>
  </section>;
}
