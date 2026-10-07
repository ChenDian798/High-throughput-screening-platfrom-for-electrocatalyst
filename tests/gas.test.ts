import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GAS_DEFAULTS,gasCalculation,gasError} from '../lib/gas';
import {DEFAULTS,segmentLength,withGasControl} from '../lib/geometry';
import {Machine,calibrate,disabledReason,initial,request,segmentLayout,status,tick,visibleSegments} from '../lib/machine';
function finish(s:Machine) {let n=0;while(s.queue.length&&n++<10000)s=tick(s,.01);assert.ok(n<10000);return s;}

test('circular and rectangular geometry, time and target modes use explicit units',()=>{
  const circle=gasCalculation(GAS_DEFAULTS);
  assert.equal(circle.volume,20);assert.equal(circle.seconds,.5);assert.ok(Math.abs(circle.length-80/Math.PI)<1e-10);
  const rectangular=gasCalculation({...GAS_DEFAULTS,geometry:'rectangular',width:2,height:.5});
  assert.equal(rectangular.area,1);assert.equal(rectangular.length,20);
  for(const geometry of ['circular','rectangular'] as const) {
    const g={...GAS_DEFAULTS,geometry,mode:'length' as const,targetLength:5,width:2,height:.5};
    const c=gasCalculation(g),p=withGasControl(DEFAULTS,g);
    assert.ok(Math.abs(c.length-5)<1e-10);assert.equal(c.volume,5*c.area);assert.equal(c.seconds,c.volume/g.flow);
    assert.equal(p.gasVolume,c.volume);assert.ok(Math.abs(segmentLength(p.gasVolume,p)-5)<1e-10);
  }
  assert.ok(gasError({...GAS_DEFAULTS,flow:0}));assert.ok(gasError({...GAS_DEFAULTS,diameter:NaN}));
});

test('a timed gap grows at the junction, closes at t_g, and pause freezes injection',()=>{
  let s=request(initial(),'insertGas');
  assert.equal(status(s).gas,true);assert.equal(status(s).pump,false);assert.equal(visibleSegments(s)[0].volume,0);
  s=tick(s,.25);assert.equal(visibleSegments(s)[0].volume,10);assert.equal(s.segments.length,0);
  assert.ok(Math.abs(segmentLayout(s)[0].start)<1e-10);
  const paused={...s,paused:true};assert.strictEqual(tick(paused,10),paused);assert.equal(status(paused).gas,false);
  s=tick({...paused,paused:false},.25);
  assert.equal(status(s).gas,false);assert.equal(s.segments[0].volume,20);
  assert.equal(s.lastGasInjection?.seconds,.5);assert.deepEqual(s.fills,[0,0,0]);
  assert.ok(disabledReason(finish(s),'transport'));assert.ok(disabledReason(finish(s),'generate'));
  const park=finish(request(initial(),'park'));assert.ok(disabledReason(park,'insertGas'));
});

test('generation and transport are separate; train order, volumes and no overlap persist',()=>{
  let s=request(initial(),'generate'),n=0;
  while(s.queue.length&&n++<10000) {
    const st=status(s);assert.equal(st.gas&&st.pump,false);
    if(s.queue[0].kind==='stop'||s.queue[0].kind==='select') assert.equal(st.flowing,false);
    s=tick(s,.01);
  }
  assert.ok(s.loaded);assert.equal(s.transported,false);assert.equal(s.transport,0);assert.deepEqual(s.fills,[0,0,0]);
  assert.deepEqual(s.segments.map(seg=>seg.kind),['A','boundary','Ar','boundary','B','boundary','Ar','boundary','C']);
  const before=segmentLayout(s),volumes=s.segments.map(seg=>seg.volume);
  assert.ok(before[0].end<1);assert.ok(before[0].start>before.at(-1)!.end);
  assert.ok(disabledReason(s,'a'));s=request(s,'transport');s=tick(s,1);
  assert.equal(status(s).gas,false);assert.ok(segmentLayout(s)[0].end>before[0].end);
  assert.deepEqual(s.segments.map(seg=>seg.volume),volumes);
  s=finish(s);assert.equal(s.transported,true);assert.ok(Math.abs(segmentLayout(s)[0].end-1)<1e-10);assert.equal(disabledReason(s,'a'),null);
});

test('calibration uses completed test conditions, never fabricates measured data or changes slug volumes',()=>{
  let s=initial();assert.equal(gasCalculation(s.config.gasControl).corrected,null);assert.strictEqual(calibrate(s,5),s);
  s=finish(request(s,'insertGas'));const predicted=s.lastGasInjection!.predicted;
  assert.strictEqual(calibrate(s,0),s);
  s=calibrate(s,predicted*.8);
  assert.ok(Math.abs(s.config.gasControl.calibrationFactor!-.8)<1e-10);
  assert.ok(Math.abs(gasCalculation(s.config.gasControl).corrected!-predicted*.8)<1e-10);
  assert.equal(s.segments[0].volume,20);assert.equal(s.lastGasInjection!.measured,predicted*.8);
  s=finish(request(s,'flush'));assert.equal(s.segments.length,0);assert.deepEqual(s.fills,[0,0,0]);
});

test('segment path coordinates remain within spline bounds during fractional creation and transport',()=>{
  for(const mode of ['time','length'] as const) {
    let s=request(initial(withGasControl(DEFAULTS,{...GAS_DEFAULTS,mode,targetLength:5})),'full'),n=0;
    while(s.queue.length&&n++<10000) {
      for(const {start,end} of segmentLayout(s)) {
        assert.ok(start>=0&&end<=1&&start<=end,`invalid spline interval: ${start}..${end}`);
      }
      s=tick(s,.0137);
    }
    assert.ok(n<10000);
  }
});
