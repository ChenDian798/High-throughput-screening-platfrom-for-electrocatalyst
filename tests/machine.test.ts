import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, DESIGN, Config, geometryCheck, liquidHeight, roundedArea, wellX, segmentLength } from '../lib/geometry';
import { Machine, initial, request, tick, status, disabledReason } from '../lib/machine';
function finish(s:Machine, inspect?:(s:Machine)=>void) {
  let count=0;
  while(s.queue.length && count++<30000) { inspect?.(s); s=tick(s,.01); }
  assert.ok(count<30000,'sequence must terminate'); return s;
}
test('full sequence maintains station, flow, collision and volume invariants',()=>{
  const visits=new Set<string>(); let lowering=false;
  const s=finish(request(initial(),'full'),s=>{
    const step=s.queue[0],st=status(s),p=s.config;
    if(step.kind==='move') {assert.equal(st.flowing,false);assert.equal(st.antiDrip,true);}
    if(['load','waste','flush'].includes(step.kind)) assert.equal(s.station,'Waste');
    if(step.kind==='dispense') {
      assert.equal(s.lid,1);assert.equal(s.station,`Well ${step.index!+1}`);
      assert.equal(s.position[0],wellX(step.index!,p));assert.ok(s.position[1]>p.depth);
      assert.equal(s.segments[0].kind,['A','B','C'][step.index!]);visits.add(s.station);
    }
    if(step.kind==='move'||step.kind==='dispense') {
      assert.ok(s.position[1]>p.depth,'nozzle above rim');
      assert.ok(s.position[1]+4.4<p.clearance+p.depth+11,'tool arm below raised protrusions');
    }
    if(step.kind==='lower') {
      lowering=true; assert.equal(s.station,'Park');assert.equal(geometryCheck(p,s.fills).errors.length,0);
      const tip=p.clearance+s.lid*(p.depth+11);
      s.fills.forEach(v=>{
        const h=liquidHeight(v,tip,p);
        const volume=roundedArea(p.width,p.length,DESIGN.corner)*h-roundedArea(p.postWidth,p.postLength,DESIGN.postCorner)*Math.max(0,h-tip);
        assert.ok(Math.abs(volume-v)<1e-6);assert.ok(h<p.depth);assert.ok(tip>0);
      });
    }
    if(st.gas) {assert.equal(step.kind,'load');assert.equal(step.segment?.kind,p.gas);assert.equal(st.pump,false);}
  });
  assert.equal(visits.size,3);assert.ok(lowering);assert.deepEqual(s.fills,[80,80,80]);assert.equal(s.lid,0);assert.equal(s.station,'Park');assert.equal(s.segments.length,0);
  assert.equal(status(s).flowing,false);assert.ok(Math.abs(s.wasteVolume-16)<1e-6);
});
test('manual order, closure envelope, gap and flush interlocks',()=>{
  let s=initial(); assert.ok(disabledReason(s,'a'));assert.ok(disabledReason(s,'lower'));assert.ok(disabledReason(s,'gap'));
  s=finish(request(s,'load'));assert.equal(s.segments[0].kind,'A');assert.ok(disabledReason(s,'b'));
  s=finish(request(s,'a'));assert.equal(s.fills[0],80);assert.ok(disabledReason(s,'b'));assert.ok(disabledReason(s,'flush'));
  s=finish(request(s,'gap'));assert.equal(s.station,'Waste');assert.equal(s.segments[0].kind,'B');
  s=finish(request(s,'b'));s=finish(request(s,'gap'));s=finish(request(s,'c'));
  assert.ok(disabledReason(s,'lower'));s=finish(request(s,'park'));s=finish(request(s,'lower'));
  assert.ok(disabledReason(s,'a'));assert.ok(disabledReason(s,'waste'));
  s=finish(request(s,'raise'));s=finish(request(s,'waste'));s=finish(request(s,'flush'));assert.deepEqual(s.fills,[80,80,80]);
});
test('pause freezes all state and stops gas, pump, outlet; reset restores empty raised instrument',()=>{
  let s=request(initial(),'full');s=tick(s,.05);s={...s,paused:true};
  assert.strictEqual(tick(s,100),s);assert.equal(status(s).flowing,false);assert.equal(status(s).gas,false);assert.equal(status(s).pump,false);assert.equal(status(s).antiDrip,true);
  assert.deepEqual(initial(s.config).fills,[0,0,0]);assert.equal(initial(s.config).lid,1);
});
test('geometry rejects overflow, bottom contact, dry posts and sidewall interference',()=>{
  const invalid:Config[]=[{...DEFAULTS,volume:150},{...DEFAULTS,clearance:0},{...DEFAULTS,clearance:3.5},{...DEFAULTS,postWidth:8}];
  for(const p of invalid) {
    assert.ok(geometryCheck(p,[p.volume,p.volume,p.volume]).errors.length);
    assert.ok(disabledReason(initial(p),'full'));
  }
  assert.equal(geometryCheck(DEFAULTS,[80,80,80]).errors.length,0);
  assert.ok(geometryCheck(DEFAULTS,[0,0,0]).errors.length);
});
test('one to three wells and gas choices remain synchronized',()=>{
  for(const count of [1,2,3]) for(const gas of ['Air','N2','Ar'] as const) {
    const s=finish(request(initial({...DEFAULTS,count,gas}),'full'));
    assert.equal(s.lid,0);assert.equal(s.nextWell,count);assert.deepEqual(s.fills,Array(count).fill(80));
  }
});
test('segment lengths derive from volume and tube area; default displacement is consistent',()=>{
  assert.ok(Math.abs(segmentLength(80)*Math.PI/4-80)<1e-8);
  assert.ok(Math.abs(liquidHeight(80,DEFAULTS.clearance,DEFAULTS)-2.84)<.01);
});
