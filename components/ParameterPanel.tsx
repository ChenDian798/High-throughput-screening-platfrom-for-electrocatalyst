'use client';
import { Config, DESIGN, geometryCheck, roundedArea, segmentLength } from '@/lib/geometry';
const fields: {key: Exclude<keyof Config,'gas'>;label:string;unit:string;min:number;max:number;step:number}[] = [
  {key:'volume',label:'Usable dose / well',unit:'μL',min:1,max:250,step:1},
  {key:'gasVolume',label:'Separating gas gap',unit:'μL',min:1,max:100,step:1},
  {key:'flowRate',label:'Dosing flow rate',unit:'μL/s',min:1,max:200,step:1},
  {key:'travelSpeed',label:'Robot travel speed',unit:'mm/s',min:1,max:100,step:1},
  {key:'width',label:'Well internal width',unit:'mm',min:2,max:14,step:.5},
  {key:'length',label:'Well internal length',unit:'mm',min:2,max:12,step:.5},
  {key:'depth',label:'Well depth',unit:'mm',min:2,max:8,step:.5},
  {key:'count',label:'Number of active wells',unit:'1–3',min:1,max:3,step:1},
  {key:'postWidth',label:'Protrusion width',unit:'mm',min:1,max:13,step:.5},
  {key:'postLength',label:'Protrusion length (footprint)',unit:'mm',min:1,max:11,step:.5},
  {key:'clearance',label:'Closed bottom clearance',unit:'mm',min:.1,max:7,step:.1}
];
export default function ParameterPanel({ config,change,locked }: { config:Config;change:(config:Config)=>void;locked:boolean }) {
  const check=geometryCheck(config,Array(config.count).fill(config.volume));
  return <div>
    <p className="panel-copy">Visualization defaults only. Editing parameters resets the empty instrument. Reset first to change a loaded configuration.</p>
    <fieldset disabled={locked} className="parameter-fields">
      {fields.map(f=><label key={f.key}><span>{f.label}</span><div><input type="number" aria-label={f.label} value={config[f.key]} min={f.min} max={f.max} step={f.step} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)) change({...config,[f.key]:Math.max(f.min,Math.min(f.max,f.key==='count'?Math.round(n):n))});}}/><small>{f.unit}</small></div></label>)}
      <label><span>Gas type</span><select value={config.gas} onChange={e=>change({...config,gas:e.target.value as Config['gas']})}><option>Ar</option><option>N2</option><option>Air</option></select></label>
    </fieldset>
    {locked&&<p className="note">Parameters locked during operation or while wells / line contain liquid.</p>}
    <div className={`geometry-card ${check.errors.length?'invalid':''}`}><h3>{check.errors.length?'⚠ Geometry warning':'✓ Closure geometry valid'}</h3>
      {check.errors.length?<ul>{check.errors.map(e=><li key={e}>{e}</li>)}</ul>:<dl>
        <div><dt>Open liquid height</dt><dd>{(config.volume/roundedArea(config.width,config.length,DESIGN.corner)).toFixed(2)} mm</dd></div>
        <div><dt>Closed liquid height</dt><dd>{check.heights[0].toFixed(2)} mm</dd></div>
        <div><dt>Remaining headspace</dt><dd>{check.headspace.toFixed(2)} mm</dd></div>
        <div><dt>Derived protrusion extension</dt><dd>{check.postLength.toFixed(2)} mm</dd></div>
        <div><dt>Usable slug length · Ø 1 mm ID</dt><dd>{segmentLength(config.volume).toFixed(1)} mm</dd></div>
      </dl>}
    </div>
    <p className="footnote">1 μL = 1 mm³. Rounded footprint area and submerged protrusion displacement determine liquid height by numerical volume balance. Wall thickness: 2 mm. Boundary discard: {DESIGN.boundaryVolume} μL on each side of a gas gap. Gas volumes are conceptual at local line conditions; compressibility is not modeled.</p>
  </div>;
}
