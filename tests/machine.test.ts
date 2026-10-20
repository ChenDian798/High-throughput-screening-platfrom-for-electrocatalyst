import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, DESIGN, Config, boreArea, capTop, cellX, cellZ, cells, geometryCheck, liquidHeight, segmentLength, septumOffset } from '../lib/geometry';
import { Machine, initial, request, tick, status, disabledReason, safeHeight, cellStation } from '../lib/machine';
function finish(s:Machine, inspect?:(s:Machine)=>void) {
  let count=0;
  while(s.queue.length && count++<30000) { inspect?.(s); s=tick(s,.01); }
  assert.ok(count<30000,'sequence must terminate'); return s;
}
const full=(n:number,v=DEFAULTS.volume)=>Array(n*DESIGN.rows).fill(v);
test('full sequence fills both rows per column through septa, then applies row potentials',()=>{
  const visits:string[]=[]; let applied=false;
  const s=finish(request(initial(),'full'),s=>{
    const step=s.queue[0],st=status(s),p=s.config;
    assert.equal(s.outputs,false,'fluidics and robot run with outputs off');
    if(step.kind==='move') {assert.equal(st.flowing,false);assert.equal(st.antiDrip,true);}
    if(['load','waste','flush'].includes(step.kind)) assert.equal(s.station,'Waste');
    if(step.kind==='dispense') {
      const c=cells(p)[step.index!];
      assert.equal(s.station,cellStation(c.index,p));
      assert.equal(s.position[0],cellX(c.col,p)+septumOffset);assert.equal(s.position[2],cellZ(c.row));
      assert.ok(s.position[1]>capTop(p),'nozzle body stays above the cap');
      assert.equal(s.segments[0].kind,['A','B','C'][c.col]);
      if(visits.at(-1)!==s.station) visits.push(s.station);
    }
    if(step.kind==='move') assert.ok(s.position[1]>capTop(p),'robot never drops below the caps');
    if(step.kind==='apply') {applied=true;assert.equal(s.station,'Park');assert.equal(geometryCheck(p,s.fills).errors.length,0);}
    if(st.gas) {assert.equal(step.kind,'gas');assert.equal(status(s).pump,false);assert.equal(s.station,'Waste');}
  });
  assert.deepEqual(visits,['Cell R1·A','Cell R2·A','Cell R1·B','Cell R2·B','Cell R1·C','Cell R2·C']);
  assert.ok(applied);assert.equal(s.outputs,true);assert.deepEqual(s.fills,full(3));assert.equal(s.station,'Park');assert.equal(s.segments.length,0);
  assert.equal(status(s).flowing,false);assert.equal(status(s).outputs,'ON');assert.ok(Math.abs(s.wasteVolume-16)<1e-6);
});
test('manual order, outputs and flush interlocks',()=>{
  let s=initial(); assert.ok(disabledReason(s,'a'));assert.ok(disabledReason(s,'apply'));assert.ok(disabledReason(s,'off'));assert.ok(disabledReason(s,'gap'));
  s=finish(request(s,'load'));assert.equal(s.segments[0].kind,'A');assert.equal(s.segments[0].volume,DEFAULTS.volume*2);assert.ok(disabledReason(s,'b'));
  assert.ok(disabledReason(s,'a'));s=finish(request(s,'transport'));
  s=finish(request(s,'a'));assert.deepEqual(s.fills.slice(0,2),[300,300]);assert.ok(disabledReason(s,'b'));assert.ok(disabledReason(s,'flush'));
  s=finish(request(s,'gap'));assert.equal(s.station,'Waste');assert.equal(s.segments[0].kind,'B');
  s=finish(request(s,'b'));s=finish(request(s,'gap'));s=finish(request(s,'c'));
  assert.ok(disabledReason(s,'apply'),'must park first');s=finish(request(s,'park'));s=finish(request(s,'apply'));
  assert.equal(s.outputs,true);assert.ok(disabledReason(s,'waste'));assert.ok(disabledReason(s,'flush'));assert.ok(disabledReason(s,'apply'));
  s=finish(request(s,'off'));assert.equal(s.outputs,false);s=finish(request(s,'waste'));s=finish(request(s,'flush'));assert.deepEqual(s.fills,full(3));
});
test('dispensing never overshoots a cell and the column slug is shared by both rows',()=>{
  let s=finish(request(initial(),'load'));s=finish(request(s,'transport'));
  s=finish(request(s,'a'),s=>{s.fills.forEach(v=>assert.ok(v<=s.config.volume+1e-9));});
  assert.equal(s.nextWell,1);assert.equal(s.segments[0].kind,'boundary');
});
test('pause freezes all state and stops gas, pump, outlet; reset restores empty instrument with outputs off',()=>{
  let s=request(initial(),'full');s=tick(s,.05);s={...s,paused:true};
  assert.strictEqual(tick(s,100),s);assert.equal(status(s).flowing,false);assert.equal(status(s).gas,false);assert.equal(status(s).pump,false);assert.equal(status(s).antiDrip,true);
  assert.deepEqual(initial(s.config).fills,full(3,0));assert.equal(initial(s.config).outputs,false);
});
test('geometry rejects overfill, dry QRCE, oversize bore and out-of-range potentials',()=>{
  const invalid:Config[]=[{...DEFAULTS,volume:500},{...DEFAULTS,volume:60},{...DEFAULTS,qrceGap:13.5},{...DEFAULTS,diameter:8.5},{...DEFAULTS,e2:-4.5}];
  for(const p of invalid) {
    assert.ok(geometryCheck(p,full(p.count,p.volume)).errors.length,JSON.stringify(p));
    assert.ok(disabledReason(initial(p),'full'));
  }
  assert.equal(geometryCheck(DEFAULTS,full(3)).errors.length,0);
  assert.ok(geometryCheck(DEFAULTS,full(3,0)).errors.length);
});
test('one to three columns × two rows and gas choices remain synchronized',()=>{
  for(const count of [1,2,3]) for(const gas of ['Air','N2','Ar'] as const) {
    const s=finish(request(initial({...DEFAULTS,count,gas}),'full'));
    assert.equal(s.outputs,true);assert.equal(s.nextWell,count);assert.deepEqual(s.fills,full(count));
  }
});
test('liquid height balances bore volume against QRCE wire displacement',()=>{
  const p=DEFAULTS,h=liquidHeight(p.volume,p),wire=Math.PI*DESIGN.wire**2/4;
  assert.ok(Math.abs(boreArea(p)*h-wire*(h-p.qrceGap)-p.volume)<1e-6);
  assert.ok(h>p.qrceGap&&h<p.depth-DESIGN.headspace);
  assert.ok(safeHeight(p)>capTop(p));
  assert.ok(Math.abs(segmentLength(80)*Math.PI/4-80)<1e-8);
});
