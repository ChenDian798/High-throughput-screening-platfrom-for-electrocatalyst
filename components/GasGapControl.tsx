'use client';
import { useState } from 'react';
import { Config, NAMES, withGasControl } from '@/lib/geometry';
import { GAS_COMPONENTS, GasSettings, gasCalculation, gasError } from '@/lib/gas';
import { Action, Machine, disabledReason, status } from '@/lib/machine';

function TimingDiagram({machine}:{machine:Machine}) {
  const p=machine.config,g=gasCalculation(p.gasControl),step=machine.queue[0];
  const phases=Array.from({length:p.count},(_,i)=>[{name:`${NAMES[i]} dosing`,gas:false,duration:p.volume/p.flowRate},...(i<p.count-1?[{name:`${p.gas} injection`,gas:true,duration:g.seconds}]:[])]).flat();
  let x=130;
  return <div className="svg-scroll timing-diagram"><svg viewBox="0 0 800 120" role="img" aria-label="Liquid dosing and gas injection alternate without overlap">
    <text x="8" y="52">Liquid dosing</text><text x="8" y="91">Gas valve</text>
    {phases.map((phase,i)=>{const width=630/phases.length,start=x;x+=width;
      const gasIndex=machine.segments.filter(seg=>seg.kind===p.gas).length;
      const active=!machine.paused&&(phase.gas?step?.kind==='gas'&&i===gasIndex*2+1:step?.kind==='load'&&step.segment?.kind===phase.name[0]);
      return <g key={i}><title>{`${phase.name}: ${phase.duration.toFixed(3)} s (ideal timing)`}</title><rect x={start} y={27} width={width} height={75} fill={active?'#e3f3ef':'transparent'}/><text x={start+width/2} y={17} textAnchor="middle">{phase.name}</text><path d={`M${start} ${phase.gas?61:39}H${start+width} M${start} ${phase.gas?78:100}H${start+width}`} stroke={phase.gas?'#8299a7':'#0072b2'} strokeWidth={phase.gas?2:5}/><path d={`M${start} ${phase.gas?78:100}H${start+width}`} stroke="#007b79" strokeWidth={phase.gas?5:2}/><path d={`M${start} 28V105`} stroke="#d5e0e7" strokeDasharray="2 3"/></g>;
    })}
  </svg></div>;
}

export default function GasGapControl({machine,act,change,calibration,pause,reset}:{machine:Machine;act:(a:Action)=>void;change:(p:Config)=>void;calibration:(n:number)=>void;pause:()=>void;reset:()=>void}) {
  const [measured,setMeasured]=useState('');
  const g=machine.config.gasControl,c=gasCalculation(g),st=status(machine),sample=machine.lastGasInjection;
  const locked=machine.queue.length>0||machine.segments.length>0||machine.loaded||machine.fills.some(v=>v>0)||machine.lid!==1;
  const changeGas=(part:Partial<GasSettings>)=>change(withGasControl(machine.config,{...g,...part,calibrationFactor:null}));
  const numberField=(key:'diameter'|'width'|'height'|'flow'|'pressure'|'valveMs'|'targetLength',label:string,unit:string,min:number,step:number)=> <label key={key}><span>{label}</span><div><input type="number" aria-label={label} value={g[key]} min={min} step={step} onChange={e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=min) changeGas({[key]:value});}}/><small>{unit}</small></div></label>;
  const operation=(a:Action,label:string)=><button key={a} disabled={!!disabledReason(machine,a)} title={disabledReason(machine,a)??label} onClick={()=>act(a)}>{label}</button>;
  return <section className="panel gas-control" aria-label="Gas Gap Control">
    <div className="panel-heading"><h2>Gas Gap Control</h2><span className={`state-pill ${st.gas?'running':''}`}>FAST VALVE · {st.gas?'OPEN':'CLOSED'}</span></div>
    <div className="gas-control-body">
      <div>
        <p className="panel-copy">Time-metered {machine.config.gas} injection · active sequential phase switching. Liquid pump stops before the gas valve opens.</p>
        <fieldset disabled={locked} className="parameter-fields gas-fields">
          <label><span>Operating mode</span><select aria-label="Gas operating mode" value={g.mode} onChange={e=>changeGas({mode:e.target.value as GasSettings['mode']})}><option value="time">TIME CONTROL MODE</option><option value="length">TARGET LENGTH MODE</option></select></label>
          <label><span>Gas type</span><select aria-label="Injection gas type" value={machine.config.gas} onChange={e=>change({...machine.config,gas:e.target.value as Config['gas'],gasControl:{...g,calibrationFactor:null}})}><option>Ar</option><option>N2</option><option>Air</option></select></label>
          <label><span>Channel geometry</span><select aria-label="Channel geometry" value={g.geometry} onChange={e=>changeGas({geometry:e.target.value as GasSettings['geometry']})}><option value="circular">Circular tubing</option><option value="rectangular">Rectangular channel</option></select></label>
          {g.geometry==='circular'?numberField('diameter','Channel inner diameter','mm',.01,.1):<>{numberField('width','Channel width','mm',.01,.1)}{numberField('height','Channel height','mm',.01,.1)}</>}
          {numberField('pressure','Regulator pressure','bar(g)',.01,.1)}
          {numberField('flow','Gas flow rate Q_g','μL/s',.01,1)}
          {g.mode==='time'?numberField('valveMs','Valve open time t_g','ms',1,10):numberField('targetLength','Target gap length L_g','mm',.01,1)}
        </fieldset>
        {locked&&<p className="footnote">Settings locked while operating or holding fluid. Reset or flush an empty-well instrument to change the injection setup. Changing settings invalidates the calibration factor.</p>}
        {gasError(g)&&<p className="geometry-alert" role="alert">{gasError(g)}</p>}
        <dl className="gas-readings">
          <div><dt>Channel area A_channel</dt><dd>{c.area.toFixed(4)} mm²</dd></div>
          <div><dt>Programmed valve time</dt><dd>{(c.seconds*1000).toFixed(2)} ms</dd></div>
          <div><dt>Target gas volume V_g · ideal</dt><dd>{c.volume.toFixed(3)} μL</dd></div>
          <div><dt>Target gas-gap length L_g · ideal</dt><dd>{c.length.toFixed(3)} mm</dd></div>
          <div><dt>Actual measured gap · last test</dt><dd>{sample?.measured===undefined?'Not measured':`${sample.measured.toFixed(3)} mm`}</dd></div>
          <div><dt>Calibrated length · empirical estimate</dt><dd>{c.corrected===null?'Not calibrated':`${c.corrected.toFixed(3)} mm`}</dd></div>
          <div><dt>Valve status / elapsed open time</dt><dd>{st.gas?'OPEN':'CLOSED'} / {(machine.queue[0]?.kind==='gas'?machine.elapsed*1000:0).toFixed(1)} ms</dd></div>
        </dl>
        <p className="gas-formulas">V_g = Q_g × t_g<br/>L_g = V_g / A_channel<br/>{g.geometry==='circular'?'A_channel = πd² / 4':'A_channel = width × height'}<br/>{g.mode==='length'?'V_required = L_target × A_channel; t_g = V_required / Q_g':'1 μL = 1 mm³; t_g in seconds'}</p>
        <p className="footnote">Q_g means gas volume at local channel pressure and temperature. Convert standard-volume MFC readings before using these relations. Pressure is a setpoint; pressure-dependent flow and compressibility are not simulated.</p>
      </div>
      <div>
        <div className="gas-component-chain">{[[`${machine.config.gas} cylinder`,'Upstream gas supply.'],['Pressure regulator',GAS_COMPONENTS.regulator],['Gas Flow Controller',GAS_COMPONENTS.controller],['Fast solenoid valve',GAS_COMPONENTS.valve],['T-junction / phase-switch junction',GAS_COMPONENTS.junction]].map(([name,help])=><div key={name} title={help}><span>{name}</span><small>{help}</small></div>)}</div>
        <h3>Generation → separate transport</h3>
        <div className="button-grid">{operation('generate','Run Automatic Sequence')}{operation('insertGas','Insert Gas Gap')}{operation('transport','Transport Train')}<button onClick={pause} disabled={!machine.queue.length}>{machine.paused?'Resume gas sequence':'Pause gas sequence'}</button>{operation('waste','Move nozzle to Waste')}{operation('flush','Flush tube / nozzle')}<button onClick={reset}>Reset visualization</button></div>
        <p className="gas-operation" aria-live="polite">{machine.paused?'PAUSED · gas valve closed':machine.queue[0]?.name??(machine.loaded?(machine.transported?'Transport complete · ready to dispense':'Train generated · ready for Transport Train'):'Ready for timed injection')}</p>
        <p className="footnote">Automatic generation stops with {NAMES.slice(0,machine.config.count).join(` | ${machine.config.gas} | `)} retained in the line (boundary portions included). Transport advances this prepared train to the delivery outlet using the solvent carrier. During generation, earlier segments are displaced by the incoming phase; the dedicated transport operation follows generation. The open nozzle stays at waste to allow downstream air to escape. Tube storage and pressure management require validation.</p>
        <h3>Calibration</h3>
        <ol className="calibration-workflow">{['Set Q_g','Set valve opening time','Inject one gas gap','Measure actual gap length','Enter measured length','Update calibration','Repeat under the same conditions'].map(item=><li key={item}>{item}</li>)}</ol>
        <p className="footnote">Last completed gas injection: {sample?`${(sample.seconds*1000).toFixed(1)} ms · ${sample.flow} μL/s · ${sample.pressure} bar(g) · A=${sample.area.toFixed(4)} mm²`:'No test yet. Press Insert Gas Gap.'}</p>
        <label className="calibration-entry">Measured gap length <input aria-label="Measured gap length" type="number" min="0.001" step="0.1" value={measured} onChange={e=>setMeasured(e.target.value)}/><span>mm</span></label>
        <button disabled={!!machine.queue.length||!sample||!Number.isFinite(Number(measured))||Number(measured)<=0} onClick={()=>calibration(Number(measured))}>Update Calibration</button>
        <p className="gas-formulas">Calculated gap · last test: {sample?`${sample.predicted.toFixed(3)} mm`:'—'}<br/>k = L_measured / L_calculated = {g.calibrationFactor===null?'not calibrated':g.calibrationFactor.toFixed(4)}<br/>L_corrected = k × L_calculated</p>
        <p className="footnote">Measured values come from your experiment. Correction is an empirical estimate near the tested conditions, not a guarantee. Reset preserves the settings and factor; setup edits invalidate the factor.</p>
      </div>
    </div>
    <TimingDiagram machine={machine}/>
    <p className="footnote">Ideal phase timing: usable dosing intervals only; boundary conditioning occurs with the gas valve closed. Timing diagram widths are schematic, not to scale. Gas timing is displayed at 1× real time; liquid and robot animation run at 8×. Pause closes the valve and freezes remaining programmed open time.</p>
    <div className="gas-warning">Gas compressibility, backpressure, valve response time and tubing compliance can cause the actual gas-gap length to deviate from the ideal calculated value. Experimental calibration is required.</div>
    <div className="gas-notes"><div><h3>Why time-metered injection?</h3><ul>{['Independent control of gas-gap volume','Programmable gap length','Compatible with sequential precursor loading','Easier to calibrate than uncontrolled passive bubble formation','Suitable for low-throughput proof-of-concept testing'].map(text=><li key={text}>{text}</li>)}</ul></div><div><h3>Factors affecting actual gap length</h3><p>Gas pressure · gas flow rate · valve opening time · channel cross-sectional area · downstream pressure · gas compressibility · tubing compliance · valve response time · liquid surface tension and wettability.</p><p>Valve time alone does not determine the final gap length.</p></div></div>
    <details className="calibration-table"><summary>Example calibration test points · not validated measurements</summary><div className="svg-scroll"><table><thead><tr><th>Valve time</th><th>Gas flow</th><th>Predicted length</th><th>Measured length</th><th>Error</th></tr></thead><tbody>{[50,100,200,500,1000].map(ms=><tr key={ms}><td>{ms} ms</td><td>{g.flow} μL/s</td><td>{(g.flow*ms/1000/c.area).toFixed(3)} mm</td><td>Not measured</td><td>—</td></tr>)}</tbody></table></div><p className="footnote">Example test points only. Predictions use the current flow and channel area; no experimental results are supplied.</p></details>
  </section>;
}
