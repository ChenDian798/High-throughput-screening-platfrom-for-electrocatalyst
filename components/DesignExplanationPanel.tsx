export const references = [
  {name:'Microflu MF-ELFlow',url:'https://www.microflutech.com/microreactor/Electrochemistry.html',scope:'Compact electrode assemblies and clamped sealing; not an exact model of this design.'},
  {name:'Laudadio et al. · 2018',url:'https://doi.org/10.1007/s41981-018-0024-3',scope:'Shared flat electrodes and insulating flow-defining layers in a modular flow microreactor.'},
  {name:'Jud et al. · 2021',url:'https://doi.org/10.1002/cmtd.202000042',scope:'Modular layered electrode assembly with laser-cut insulating and gasket layers.'},
  {name:'AMPERE-2 · 2025',url:'https://doi.org/10.1039/D5DD00180C',scope:'Robotic electrochemistry and bottom-of-well electrodes with seals; a different platform and electrode arrangement.'},
  {name:'Kreutzer et al. · 2008',url:'https://doi.org/10.1021/ac702143r',scope:'Liquid-film-related dispersion in gas–liquid segmented transport; gas segmentation does not eliminate carryover.'}
];
const rationale = [
  ['One delivery tube for multiple formulations','Shared tube with robot-addressed nozzle.'],
  ['Different compositions in different reaction regions','Physically isolated wells with individual dispensing.'],
  ['Parallel electrode contact','Common lower electrode and upper electrode with three immersed protrusions.'],
  ['Reliable contact despite liquid-level variation','Protrusions extend below the surface while retaining bottom clearance.'],
  ['Prevent spreading between wells','Solid insulating sidewalls and individual seals.'],
  ['Reduce mixing during transport','Gas-separated segments, with boundary portions diverted to waste.']
];
const concerns=['Residual film and carryover','Segment detection and dispensing accuracy','Nozzle drips','Evaporation while wells are open','Seal reliability','Lid-induced displacement and trapped gas','Counter-electrode area and current distribution','Reaction-gas management','Cleaning wells and electrodes between runs'];
export default function DesignExplanationPanel() {
  return <div className="explanations">
    <h3>Why this architecture?</h3>
    {rationale.map(([req,design])=><div className="rationale" key={req}><span>REQUIREMENT</span><p>{req}</p><span>DESIGN</span><p>{design}</p></div>)}
    <div className="note"><b>Shared counter-electrode assembly with one immersed protrusion per well.</b><p>Shared terminal voltage does not imply equal chamber currents or independent working-electrode potential control.</p></div>
    <h3>Open engineering questions</h3><ul className="concerns">{concerns.map(c=><li key={c}>{c}</li>)}</ul>
    <p className="panel-copy">These concerns are unresolved. Separate conceptual vents permit displaced air to escape during lowering. Vent construction and reaction-gas handling need engineering validation. This assembly is not presented as a pressure-rated sealed reactor.</p>
    <h3>References · component principles</h3>
    {references.map(r=><div className="reference" key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.name} ↗</a><p>{r.scope}</p></div>)}
    <p className="note">These sources support component principles. They do not validate this complete robot-loaded, protruding-lid design.</p>
  </div>;
}
