# Robotic Single-Line Loading & Shared-Electrode Reactor

A complete interactive Next.js / TypeScript / React instrument prototype. The code generates all geometry with Three.js, React Three Fiber and Drei; the fluidic schematic is SVG. Tailwind CSS is configured with a small instrument stylesheet. No downloaded 3D assets, backend, API keys or external runtime services are required.

**Conceptual prototype — fluid delivery, sealing, electrode geometry and electrochemical performance require experimental validation.**

## Run locally

Node.js 20.9 or newer is required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. WebGL must be available in your browser.

```sh
npm run typecheck
npm test
npm run build
npm start
```

## Deploy to Vercel

1. Push this directory to a Git repository and import the repository in Vercel.
2. Select **Next.js** as the framework and this directory as the project root.
3. Use `npm run build` as the build command and the default Next.js output settings. Use Node.js 22 or 24.
4. Deploy. No environment variables are needed.

Alternatively, from this directory run `npx vercel` and follow the project prompts. Run `npx vercel --prod` when ready to publish a production deployment. This delivery is deployable source; publishing is separate.

## Operating the prototype

- **Run Full Sequence** generates and then transports the train, loads each active well, discharges each intervening boundary/gas group at waste, parks the nozzle, and lowers the lid to establish electrode contact. It stops there.
- **Load Segmented Train** and **Run Automatic Sequence** perform generation only. **Transport Train** separately advances the prepared train toward the outlet. Manual well dispensing is blocked until transport completes. **Insert Gas Gap** runs one timed calibration injection at waste, gradually forming a gas segment at the junction; flush/reset this test before generating a full train.
- Manual controls enforce the same station, ordering and geometry interlocks. **Move to Waste / Cleaning** provides access to flushing after C or after parking.
- **Pause** freezes the shared clock, stops pump/gas/flow and closes the explicit anti-drip outlet. **Resume** continues the same stage. Pausing is an idealized visualization behavior, not a validated gas/pump control procedure.
- **Flush Delivery Line** removes the modeled train and cleans the tube/nozzle at waste. It preserves every well's liquid volume. **Reset** empties the visualization only, raises the lid and returns the nozzle to waste; it is not a physical cleaning procedure.
- Parameters can be edited only on the empty raised instrument. Reset before editing a loaded instrument. The active well count is limited to 1–3 because this architecture has three formulations. With fewer wells, the unused sequence stages are dimmed.
- Orbit with left drag, zoom with the wheel and pan with right drag. Use view buttons, exploded inspection, a longitudinal cross-section, component visibility, opacity and dimensions. Exploded offsets and cutaway visibility do not alter the physical state or interlocks.
- **01 Instrument workspace** retains the robot and electrode assembly, with the updated gas injection module at the tube inlet, without the upstream precursor reservoirs/pump hardware. **02 Single-line delivery** defaults to a dedicated 3D model of the reservoirs, selector, dosing pump, gas injection, common tube, nozzle and waste collection, without duplicating the reactor or gantry. Switch to **2D schematic** for the connection diagram. **03 Combined instrument overview** separately shows the complete connected system. All views share the same timed valve, gas settings and segment layout. Reservoir feeds terminate at the selector, which connects through the pump and controlled gas junction to the single nozzle tube. A separate drain connects the waste/cleaning station to a waste reservoir, physically distinct from safe park. Components are conceptual, not validated commercial hardware or fabrication dimensions.
- Presentation mode enlarges the model and hides the side panel. Exit it to operate the controls.

## Scientific and mechanical assumptions

The reservoirs have separate feeds into one selector and dosing pump. The gas chain is **Ar cylinder → pressure regulator → Gas Flow Controller → fast solenoid valve → T-junction / phase-switch junction**. Only one common tube reaches the moving nozzle. A is loaded first and leads the train. Segment lengths are volume-derived using the selected circular or rectangular channel area; tube routing, storage length and robot dimensions are schematic and not to scale. The display reserves storage space for generation and separately advances the completed train during transport. Generation naturally displaces earlier segments from the inlet; the dedicated transport operation occurs afterward. The nozzle remains open at waste during generation for displaced downstream air. Real hardware needs validated storage length, downstream pressure management, boundary detection and synchronized phase switching. No gas is discharged into a reaction well.

## Time-metered gas injection and calibration

**Gas Gap Control** supports time control (`V_g = Q_g × t_g`, `L_g = V_g / A`) and target length (`V_g = L_target × A`, `t_g = V_g / Q_g`). Circular tubing uses `A = πd²/4`; a rectangular channel uses `A = width × height`. Volumes are in μL = mm³, flow in μL/s, lengths in mm, and displayed valve timing in ms. Regulator pressure is an editable upstream setpoint in bar(g), not a pressure simulation. Q_g must refer to local channel pressure/temperature; standard-volume flow-controller readings need conversion.

The liquid pump and gas valve never overlap. Gas volume grows during the programmed opening and stops when the valve closes. One deterministic clock drives all three 3D views, the SVG, timing diagram and controls. Liquid/robot motion is accelerated 8×; gas injection runs at 1× for visibility. Pause closes the valve and resumes the remaining programmed open time in this idealized model. The timing diagram is schematic, not to scale; boundary-conditioning intervals are excluded from its usable-dose traces.

For calibration, inject a gap, measure its length experimentally, enter the measured value and click **Update Calibration**. The factor `k = L_measured / L_calculated` uses the completed injection's recorded flow, time and channel area. `L_corrected = k × L_calculated` is an empirical estimate near those tested conditions; it is not presented as a measurement. Correcting the estimate does not change previously injected segment volumes. Reset retains the factor; setup edits invalidate it. The optional 50/100/200/500/1000 ms table contains predicted example test points and no fabricated measured results.

**Gas compressibility, backpressure, valve response time and tubing compliance can cause the actual gas-gap length to deviate from the ideal calculated value. Experimental calibration is required.** Pressure, flow, timing, area, downstream pressure, compressibility, compliance, valve response, surface tension and wettability all matter. Valve time alone does not determine the final length.

The sequence uses usable A/B/C portions with a 4 μL sacrificial boundary on each side of each gas gap. These boundary volumes are not validated. Gas-gap volume is specified at conceptual local line conditions; compressibility, residual wall films and gas expansion are not modeled. Gas valves open only during gas staging, after liquid pump delivery pauses. During travel, all flow stops and an explicit anti-drip outlet closes. No-contact nozzle dispensing occurs above the rim. A front-mounted Z carriage and cantilever nozzle arm clear the raised lid; vertical lift precedes every lateral move. The nozzle parks outside the lid footprint before closure.

The lower assembly has rigid support, insulation, one continuous working-electrode floor, individual seals and a genuinely open insulating frame. The upper assembly has a guided rigid lid, insulation, one conductive counter-electrode plate and rounded broad downward protrusions. All posts remain connected to one CE terminal; the lower plate has one WE terminal. Seals, alignment guides, stops, dry-region fasteners and clamp blocks are conceptual geometry.

Defaults, centralized in `lib/geometry.ts` and `lib/gas.ts`:

| Quantity | Default |
| --- | --- |
| Internal well dimensions | 8 × 5 × 4 mm |
| Wall thickness | 2 mm |
| Rounded internal corner radius | 0.6 mm |
| Fill volume | 80 μL / well |
| Protrusion footprint | 6 × 3 mm, 0.5 mm corner radius |
| Closed bottom clearance | 1 mm |
| Gas gap | 20 μL, Ar |
| Gas flow / valve open time | 40 μL/s / 500 ms |
| Circular channel ID / regulator pressure | 1 mm / 0.5 bar(g) |
| Initial calibration | Not calibrated; no measured values |
| Dosing / travel speed | 80 μL/s / 35 mm/s |
| Animation time scale | Liquid / robot 8×; gas injection 1×; conceptual controller |

The CE underside closes at the well-rim sealing plane. Protrusion extension is **well depth − closed bottom clearance**, not an independent dimension. Numerical bisection solves `V = well area × height − protrusion area × submerged length`, including rounded footprint areas. At defaults the open height is approximately 2.02 mm and the closed height approximately 2.84 mm, leaving about 1.16 mm headspace. The liquid geometry has a hole around submerged posts, conserving liquid volume visually and numerically. Closure is blocked for nonpositive clearance, sidewall interference, nonimmersed posts or less than 0.1 mm headspace. Actual fill volumes are checked again when closure begins.

Solid walls separate wells; no common liquid, overflow or interconnecting channel exists. Individual conceptual vent positions permit displaced air to escape. Vent construction, reaction-gas handling and pressure behavior remain unresolved. This is not a pressure-rated sealed reactor.

**Shared counter-electrode assembly with one immersed protrusion per well.**

**Shared terminal voltage does not imply equal chamber currents or independent working-electrode potential control.**

There is no reaction, electrodeposition kinetics, current-density distribution or reaction-product simulation.

## Code map

- `lib/machine.ts`: pure deterministic operation queue, interlocks, status, pause-compatible tick and logs. One `requestAnimationFrame` clock in `Instrument.tsx` advances this shared state. Each tick is clamped to the active step duration; leftover wall time is intentionally discarded at a phase boundary to avoid skipped states. Animation speed is illustrative.
- `lib/geometry.ts`: centralized defaults, rounded areas, numerical liquid height, closure validation and segment lengths.
- `lib/gas.ts` and `components/GasGapControl.tsx`: gas units/formulas, geometry selection, timed-injection controls, calibration and scientific caveats.
- `components/Scene.tsx`: procedural `SegmentedDeliveryTube`, `RobotGantry`, `DispensingNozzle`, `WasteStation`, `SharedWorkingElectrode`, `InsulatingWellFrame`, `ProtrudingCounterElectrode`, `GuidedLid` and camera controls.
- `components/FluidicSchematic.tsx`: SVG schematic, `ReservoirBank` and `GasInjectionModule` driven by the same state.
- `components/FluidicHardware.tsx` and `FluidicModel.tsx`: procedural reservoirs, selector, dosing pump, shared cylinder/regulator/flow-controller/solenoid/junction module, waste drain and collection reservoir; dedicated 3D delivery canvas. `ModelPrimitives.tsx` shares box geometry and generated label textures with the instrument scene.
- `components/CombinedOverview.tsx`: separate complete-system view using the same scene geometry and shared machine state.
- `components/ControlPanel.tsx`, `ParameterPanel.tsx`, `SequenceTimeline.tsx`, `DesignExplanationPanel.tsx`: operating controls, geometry warnings, progression and scientific context.
- `tests/machine.test.ts`: automatic/manual ordering, station routing, pause, flush preservation, closure displacement, collision-clearance invariants, invalid geometry and well-count/gas combinations.
- `tests/gas.test.ts`: circular/rectangular and time/length calculations, gradual generation, timed closure, pause, non-overlap, separate volume-conserving transport and calibration.

## Why this architecture?

| Requirement | Design |
| --- | --- |
| One delivery tube for multiple formulations | Shared tube with robot-addressed nozzle |
| Different compositions in different reaction regions | Physically isolated wells with individual dispensing |
| Parallel electrode contact | Common lower electrode and upper electrode with immersed protrusions |
| Contact despite liquid-level variation | Protrusions extend below the surface while retaining bottom clearance |
| Prevent spreading between wells | Solid insulating sidewalls and individual seals |
| Reduce mixing during transport | Gas-separated segments with boundary portions diverted to waste |

## Unresolved experimental validation

Residual film and carryover; segment detection and dispensing accuracy; nozzle drips; evaporation in open wells; seal reliability; lid displacement and trapped gas; counter-electrode area and current distribution; reaction-gas management; cleaning wells and electrodes between runs. None is claimed solved by this animation.

## References and their limits

- [Microflu MF-ELFlow](https://www.microflutech.com/microreactor/Electrochemistry.html): compact electrode assemblies and clamped sealing, not an exact model of this design.
- [Laudadio et al.](https://doi.org/10.1007/s41981-018-0024-3): shared flat electrodes and insulating flow-defining layers.
- [Jud et al.](https://doi.org/10.1002/cmtd.202000042): modular layered electrode assembly.
- [AMPERE-2](https://doi.org/10.1039/D5DD00180C): robotic electrochemistry and bottom-of-well electrodes with seals; a different electrode arrangement.
- [Kreutzer et al.](https://doi.org/10.1021/ac702143r): liquid-film-related dispersion in gas–liquid segmented transport.

These sources support component principles. They do not validate this complete robot-loaded, protruding-lid design.
