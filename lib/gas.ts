export type GasSettings = {
  mode: 'time' | 'length'; geometry: 'circular' | 'rectangular';
  diameter: number; width: number; height: number;
  flow: number; pressure: number; valveMs: number; targetLength: number;
  calibrationFactor: number | null;
};
export const GAS_DEFAULTS: GasSettings = {
  mode:'time',geometry:'circular',diameter:1,width:1,height:1,
  flow:40,pressure:0.5,valveMs:500,targetLength:5,calibrationFactor:null
};
export function gasCalculation(g:GasSettings) {
  const area=g.geometry==='circular'?Math.PI*g.diameter**2/4:g.width*g.height;
  const seconds=g.mode==='time'?g.valveMs/1000:g.targetLength*area/g.flow;
  const volume=g.flow*seconds,length=volume/area;
  return {area,seconds,volume,length,corrected:g.calibrationFactor===null?null:g.calibrationFactor*length};
}
export function gasError(g:GasSettings):string|null {
  const dimensions=g.geometry==='circular'?[g.diameter]:[g.width,g.height];
  if([...dimensions,g.flow,g.pressure,g.mode==='time'?g.valveMs:g.targetLength].some(n=>!Number.isFinite(n)||n<=0)) return 'Gas flow, pressure, channel dimensions and injection target must be positive finite values.';
  if(g.calibrationFactor!==null&&(!Number.isFinite(g.calibrationFactor)||g.calibrationFactor<=0)) return 'Calibration factor must be positive.';
  return null;
}
export const GAS_COMPONENTS = {
  regulator:'Reduces cylinder pressure and maintains a controlled upstream pressure.',
  controller:'Sets or measures the Ar volumetric flow rate. Q_g is referenced to local channel pressure and temperature; standard-flow readings need conversion.',
  valve:'Defines the duration of gas injection. Liquid dosing stops before this valve opens.',
  junction:'Combines the liquid line and gas line to create alternating liquid and gas segments.'
};
