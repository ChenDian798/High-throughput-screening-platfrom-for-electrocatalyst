'use client';
import { Config, DESIGN, boreArea, exposedArea, geometryCheck, maxCellVolume, segmentLength } from '@/lib/geometry';
const fields: {key: Exclude<keyof Config,'gas'|'gasControl'|'gasVolume'>;label:string;unit:string;min:number;max:number;step:number}[] = [
  {key:'volume',label:'Fill volume / cell',unit:'μL',min:1,max:DESIGN.maxVolume,step:10},
  {key:'e1',label:'R1 potential (vs QRCE)',unit:'V',min:-DESIGN.voltage,max:DESIGN.voltage,step:.05},
  {key:'e2',label:'R2 potential (vs QRCE)',unit:'V',min:-DESIGN.voltage,max:DESIGN.voltage,step:.05},
  {key:'flowRate',label:'Dosing flow rate',unit:'μL/s',min:1,max:300,step:1},
  {key:'travelSpeed',label:'Robot travel speed',unit:'mm/s',min:1,max:100,step:1},
  {key:'diameter',label:'Cell bore diameter',unit:'mm',min:DESIGN.gasket,max:DESIGN.pitch-1,step:.5},
  {key:'depth',label:'Cell height (WE → cap)',unit:'mm',min:6,max:20,step:.5},
  {key:'count',label:'Active columns (× 2 rows)',unit:'1–3',min:1,max:3,step:1},
  {key:'qrceGap',label:'QRCE tip above WE',unit:'mm',min:.5,max:15,step:.5}
];
export default function ParameterPanel({ config,change,locked }: { config:Config;change:(config:Config)=>void;locked:boolean }) {
  const check=geometryCheck(config,Array(config.count*DESIGN.rows).fill(config.volume));
  return <div>
    <p className="panel-copy">Visualization defaults follow the Legion cell (Ø7 mm, 9 mm pitch, ≤500 μL, 300 μL typical). Editing parameters resets the empty instrument. Reset first to change a loaded configuration.</p>
    <fieldset disabled={locked} className="parameter-fields">
      {fields.map(f=><label key={f.key}><span>{f.label}</span><div><input type="number" aria-label={f.label} value={config[f.key]} min={f.min} max={f.max} step={f.step} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)) change({...config,[f.key]:Math.max(f.min,Math.min(f.max,f.key==='count'?Math.round(n):n))});}}/><small>{f.unit}</small></div></label>)}
    </fieldset>
    {locked&&<p className="note">Parameters locked during operation, while cells / line contain liquid, or while outputs are on.</p>}
    <div className={`geometry-card ${check.errors.length?'invalid':''}`}><h3>{check.errors.length?'⚠ Geometry warning':'✓ Cell geometry valid'}</h3>
      {check.errors.length?<ul>{check.errors.map(e=><li key={e}>{e}</li>)}</ul>:<dl>
        <div><dt>Liquid height</dt><dd>{check.heights[0].toFixed(2)} mm</dd></div>
        <div><dt>QRCE immersion</dt><dd>{check.immersion.toFixed(2)} mm</dd></div>
        <div><dt>Headspace below cap</dt><dd>{check.headspace.toFixed(2)} mm</dd></div>
        <div><dt>Usable cell volume</dt><dd>{maxCellVolume(config).toFixed(0)} μL</dd></div>
        <div><dt>Exposed WE area (Ø{DESIGN.gasket} gasket)</dt><dd>{exposedArea().toFixed(1)} mm²</dd></div>
        <div><dt>Slug length per column (2 cells)</dt><dd>{segmentLength(config.volume*DESIGN.rows,config).toFixed(1)} mm</dd></div>
      </dl>}
    </div>
    <p className="footnote">Gas geometry, pressure, flow and valve timing are editable in Gas Gap Control below the delivery model. 1 μL = 1 mm³. Bore area {boreArea(config).toFixed(1)} mm²; liquid height includes the Ø{DESIGN.wire} mm QRCE wire displacement. Minimum headspace {DESIGN.headspace} mm below the septum cap. Boundary discard: {DESIGN.boundaryVolume} μL on each side of a gas gap. Instrument range in the paper: ±4 V, ±250 μA per channel.</p>
  </div>;
}
