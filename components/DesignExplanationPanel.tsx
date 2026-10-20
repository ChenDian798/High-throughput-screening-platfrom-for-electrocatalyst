export const references = [
  {name:'Gerroll et al. · Legion · 2023',url:'https://doi.org/10.1021/acsmeasuresciau.3c00022',scope:'Source of the cell array: PEEK / PDMS / glassy-carbon WE / copper stack, Ø7 mm cells at 96-well pitch, one QRCE per cell on its own FPGA-controlled channel. Legion cells are open-top; the septum caps here are an addition.'},
  {name:'Laudadio et al. · 2018',url:'https://doi.org/10.1007/s41981-018-0024-3',scope:'Shared flat electrodes and insulating flow-defining layers in a modular flow microreactor.'},
  {name:'AMPERE-2 · 2025',url:'https://doi.org/10.1039/D5DD00180C',scope:'Robotic electrochemistry and bottom-of-well electrodes with seals; a different platform and electrode arrangement.'},
  {name:'Kreutzer et al. · 2008',url:'https://doi.org/10.1021/ac702143r',scope:'Liquid-film-related dispersion in gas–liquid segmented transport; gas segmentation does not eliminate carryover.'}
];
const rationale = [
  ['One delivery tube for multiple formulations','Shared tube with robot-addressed needle nozzle.'],
  ['Same mixture, different potentials','Each formulation fills one column (R1 + R2); R1 and R2 are driven at E₁ and E₂.'],
  ['Independent control and readout per cell','One QRCE per cell on its own potentiostat channel against a common glassy-carbon WE (Legion architecture).'],
  ['Prevent spreading between cells','PDMS gasket seals every bore against the WE plate; solid PEEK walls between cells.'],
  ['Sealed cells without a moving lid','Fixed cap per cell: needle septum, sealed QRCE feedthrough and liquid-blocking vent.'],
  ['Reduce mixing during transport','Gas-separated segments, with boundary portions diverted to waste.']
];
const concerns=['Residual film and carryover','Segment detection and dispensing accuracy','Septum coring and reseal after repeated piercing','Vent membrane wetting and reaction-gas pressure','QRCE potential drift (quasi-reference)','Uncompensated resistance in an undivided two-electrode cell','Current through the QRCE altering its surface','Gasket compression uniformity across the plate','Cleaning cells, caps and the shared WE between runs'];
export default function DesignExplanationPanel() {
  return <div className="explanations">
    <h3>Why this architecture?</h3>
    {rationale.map(([req,design])=><div className="rationale" key={req}><span>REQUIREMENT</span><p>{req}</p><span>DESIGN</span><p>{design}</p></div>)}
    <div className="note"><b>Independent cells, shared working electrode.</b><p>As in Legion, each QRCE both sets the potential and carries the current of its own cell. Potentials are quoted against that QRCE, so they are only as stable as each quasi-reference.</p></div>
    <h3>Open engineering questions</h3><ul className="concerns">{concerns.map(c=><li key={c}>{c}</li>)}</ul>
    <p className="panel-copy">These concerns are unresolved. The vent lets displaced air escape while the needle fills a sealed cell; its membrane and reaction-gas handling need engineering validation. This is not a pressure-rated reactor.</p>
    <h3>References · component principles</h3>
    {references.map(r=><div className="reference" key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.name} ↗</a><p>{r.scope}</p></div>)}
    <p className="note">These sources support component principles. They do not validate this complete robot-loaded, septum-sealed design.</p>
  </div>;
}
