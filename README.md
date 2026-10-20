# Robotic Single-Line Loading & Sealed Legion Cell Array

The reactor is a 2 × 3 excerpt of the Legion electrochemical cell array (Gerroll, Kulesa, Ault & Baker, *ACS Meas. Sci. Au* 2023, 3, 371–379, [doi:10.1021/acsmeasuresciau.3c00022](https://doi.org/10.1021/acsmeasuresciau.3c00022)), with a fixed septum cap on each cell in place of Legion's open tops. Each column receives one formulation (A, B, C) in both rows; row R1 runs at E₁ and row R2 at E₂.

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

- **Run Full Sequence** generates and then transports the train, fills R1 and R2 of each active column through their septa, discharges each intervening boundary/gas group at waste, parks the nozzle, and applies E₁ to row R1 and E₂ to row R2 (one channel per cell). It stops there; **Cell Outputs Off** switches every channel off.
- **Load Segmented Train** and **Run Automatic Sequence** perform generation only. **Transport Train** separately advances the prepared train toward the outlet. Manual well dispensing is blocked until transport completes. **Insert Gas Gap** runs one timed calibration injection at waste, gradually forming a gas segment at the junction; flush/reset this test before generating a full train.
- Manual controls enforce the same station, ordering and geometry interlocks. **Move to Waste / Cleaning** provides access to flushing after C or after parking.
- **Pause** freezes the shared clock, stops pump/gas/flow and closes the explicit anti-drip outlet. **Resume** continues the same stage. Pausing is an idealized visualization behavior, not a validated gas/pump control procedure.
- **Flush Delivery Line** removes the modeled train and cleans the tube/nozzle at waste. It preserves every cell's liquid volume. **Reset** empties the visualization only, switches outputs off and returns the nozzle to waste; it is not a physical cleaning procedure.
- Fluidic and robot operations are blocked while cell outputs are on. Parameters can be edited only on the empty instrument with outputs off. Reset before editing a loaded instrument. Active columns are limited to 1–3 (always × 2 rows) because there are three formulations. With fewer columns, the unused sequence stages are dimmed.
- Orbit with left drag, zoom with the wheel and pan with right drag. Use view buttons, exploded inspection, a cross-section through the R2 cell centres, cap/QRCE and cell-block visibility, opacity and dimensions. Exploded offsets and cutaway visibility do not alter the physical state or interlocks.
- **01 Instrument workspace** retains the robot and electrode assembly, with the updated gas injection module at the tube inlet, without the upstream precursor reservoirs/pump hardware. **02 Single-line delivery** defaults to a dedicated 3D model of the reservoirs, selector, dosing pump, gas injection, common tube, nozzle and waste collection, without duplicating the reactor or gantry. Switch to **2D schematic** for the connection diagram. **03 Combined instrument overview** separately shows the complete connected system. All views share the same timed valve, gas settings and segment layout. Reservoir feeds terminate at the selector, which connects through the pump and controlled gas junction to the single nozzle tube. A separate drain connects the waste/cleaning station to a waste reservoir, physically distinct from safe park. Components are conceptual, not validated commercial hardware or fabrication dimensions.
- Presentation mode enlarges the model and hides the side panel. Exit it to operate the controls.

## Scientific and mechanical assumptions

The reservoirs have separate feeds into one selector and dosing pump. The gas chain is **Ar cylinder → pressure regulator → Gas Flow Controller → fast solenoid valve → T-junction / phase-switch junction**. Only one common tube reaches the moving nozzle. A is loaded first and leads the train. Segment lengths are volume-derived using the selected circular or rectangular channel area; tube routing, storage length and robot dimensions are schematic and not to scale. The display reserves storage space for generation and separately advances the completed train during transport. Generation naturally displaces earlier segments from the inlet; the dedicated transport operation occurs afterward. The nozzle remains open at waste during generation for displaced downstream air. Real hardware needs validated storage length, downstream pressure management, boundary detection and synchronized phase switching. No gas is discharged into a reaction well.

## Time-metered gas injection and calibration

**Gas Gap Control** supports time control (`V_g = Q_g × t_g`, `L_g = V_g / A`) and target length (`V_g = L_target × A`, `t_g = V_g / Q_g`). Circular tubing uses `A = πd²/4`; a rectangular channel uses `A = width × height`. Volumes are in μL = mm³, flow in μL/s, lengths in mm, and displayed valve timing in ms. Regulator pressure is an editable upstream setpoint in bar(g), not a pressure simulation. Q_g must refer to local channel pressure/temperature; standard-volume flow-controller readings need conversion.

The liquid pump and gas valve never overlap. Gas volume grows during the programmed opening and stops when the valve closes. One deterministic clock drives all three 3D views, the SVG, timing diagram and controls. Liquid/robot motion is accelerated 8×; gas injection runs at 1× for visibility. Pause closes the valve and resumes the remaining programmed open time in this idealized model. The timing diagram is schematic, not to scale; boundary-conditioning intervals are excluded from its usable-dose traces.

For calibration, inject a gap, measure its length experimentally, enter the measured value and click **Update Calibration**. The factor `k = L_measured / L_calculated` uses the completed injection's recorded flow, time and channel area. `L_corrected = k × L_calculated` is an empirical estimate near those tested conditions; it is not presented as a measurement. Correcting the estimate does not change previously injected segment volumes. Reset retains the factor; setup edits invalidate it. The optional 50/100/200/500/1000 ms table contains predicted example test points and no fabricated measured results.

**Gas compressibility, backpressure, valve response time and tubing compliance can cause the actual gas-gap length to deviate from the ideal calculated value. Experimental calibration is required.** Pressure, flow, timing, area, downstream pressure, compressibility, compliance, valve response, surface tension and wettability all matter. Valve time alone does not determine the final length.

The sequence uses usable A/B/C portions with a 4 μL sacrificial boundary on each side of each gas gap. These boundary volumes are not validated. Gas-gap volume is specified at conceptual local line conditions; compressibility, residual wall films and gas expansion are not modeled. Gas valves open only during gas staging, after liquid pump delivery pauses. During travel, all flow stops and an explicit anti-drip outlet closes. The nozzle carries a short needle that passes through a cell's septum; the nozzle body stays above the cap and the liquid falls from the needle tip without touching the electrolyte. Vertical lift to a safe height above the caps precedes every lateral move. The nozzle parks clear of the array before potentials are applied.

The cell array follows Legion's stack, bottom to top: PEEK base, copper contact plate, 3 mm glassy-carbon working-electrode plate (common to every cell), PDMS gasket with one Ø6 mm opening per cell, and a PEEK block with Ø7 mm bores at the 9 mm 96-well pitch, clamped by four corner screws. Each cell has its own Ag quasi-reference counter electrode (QRCE, Ø1 mm wire) wired through a pin header to its own potentiostat channel, as Legion connects its QRCEs to FPGA-controlled 8-channel boards. Legion's cells are open-top; here each bore is closed by a fixed cap with a needle septum, a sealed QRCE feedthrough and a liquid-blocking vent. There is no moving lid and no counter-electrode plate.

Defaults, centralized in `lib/geometry.ts` and `lib/gas.ts`:

| Quantity | Default |
| --- | --- |
| Cell array | 2 rows × 3 columns, 9 mm pitch |
| Cell bore / height (WE → cap) | Ø7 mm / 14 mm |
| Exposed WE (gasket opening) | Ø6 mm, 28.3 mm² |
| Fill volume | 300 μL / cell (Legion: ≤500 μL, 300 μL typical) |
| QRCE | Ø1 mm Ag wire, tip 2 mm above the WE |
| Septum cap | 2.5 mm, one per cell; ≥1 mm headspace kept below it |
| Row potentials | R1 −0.80 V, R2 −1.20 V vs QRCE (range ±4 V as in Legion) |
| Gas gap | 20 μL, Ar |
| Gas flow / valve open time | 40 μL/s / 500 ms |
| Circular channel ID / regulator pressure | 1 mm / 0.5 bar(g) |
| Initial calibration | Not calibrated; no measured values |
| Dosing / travel speed | 150 μL/s / 35 mm/s |
| Animation time scale | Liquid / robot 8×; gas injection 1×; conceptual controller |

Each formulation slug is sized for both cells of its column (2 × 300 μL). Numerical bisection solves `V = bore area × height − wire area × (height − QRCE gap)`. At defaults the liquid height is about 7.92 mm, giving about 5.92 mm QRCE immersion and 6.08 mm headspace. Loading and applying potentials are blocked if a QRCE would be immersed by less than 0.5 mm, if headspace falls below 1 mm, if the bore does not leave a 1 mm wall or is smaller than the gasket opening, or if a potential is outside ±4 V. Actual fills are checked again when potentials are applied.

The gasket seals each bore against the WE plate and solid PEEK separates cells; no common liquid or interconnecting channel exists. The vent lets displaced air out while a sealed cell fills; membrane choice, septum reseal and reaction-gas pressure remain unresolved. This is not a pressure-rated reactor.

**Independent cells, shared working electrode.** Each QRCE both sets its cell's potential and carries its current, so potentials are quoted against a quasi-reference and are only as stable as each QRCE.

There is no reaction, electrodeposition kinetics, current-density distribution or reaction-product simulation.

## Code map

- `lib/machine.ts`: pure deterministic operation queue, interlocks, status, pause-compatible tick and logs. One `requestAnimationFrame` clock in `Instrument.tsx` advances this shared state. Each tick is clamped to the active step duration; leftover wall time is intentionally discarded at a phase boundary to avoid skipped states. Animation speed is illustrative.
- `lib/geometry.ts`: centralized defaults, cell layout (columns × rows), numerical liquid height, cell validation, row potentials and segment lengths.
- `lib/gas.ts` and `components/GasGapControl.tsx`: gas units/formulas, geometry selection, timed-injection controls, calibration and scientific caveats.
- `components/Scene.tsx`: procedural `SegmentedDeliveryTube`, `RobotGantry`, `DispensingNozzle`, `WasteStation`, `LegionStack`, `SeptumCap`, `CellLiquid`, `QRCE`, `PotentiostatBoard` and camera controls.
- `components/FluidicSchematic.tsx`: SVG schematic, `ReservoirBank` and `GasInjectionModule` driven by the same state.
- `components/FluidicHardware.tsx` and `FluidicModel.tsx`: procedural reservoirs, selector, dosing pump, shared cylinder/regulator/flow-controller/solenoid/junction module, waste drain and collection reservoir; dedicated 3D delivery canvas. `ModelPrimitives.tsx` shares box geometry and generated label textures with the instrument scene.
- `components/CombinedOverview.tsx`: separate complete-system view using the same scene geometry and shared machine state.
- `components/ControlPanel.tsx`, `ParameterPanel.tsx`, `SequenceTimeline.tsx`, `DesignExplanationPanel.tsx`: operating controls, geometry warnings, progression and scientific context.
- `tests/machine.test.ts`: column-wise R1/R2 dispensing order, septum station routing, output interlocks, pause, flush preservation, wire displacement, invalid geometry/potentials and column-count/gas combinations.
- `tests/gas.test.ts`: circular/rectangular and time/length calculations, gradual generation, timed closure, pause, non-overlap, separate volume-conserving transport and calibration.

## Why this architecture?

| Requirement | Design |
| --- | --- |
| One delivery tube for multiple formulations | Shared tube with robot-addressed nozzle |
| Same mixture, different potentials | One formulation per column; R1 and R2 driven at E₁ and E₂ |
| Independent control and readout per cell | One QRCE per cell on its own channel against a common glassy-carbon WE (Legion) |
| Prevent spreading between cells | PDMS gasket seals each bore against the WE; solid PEEK walls |
| Sealed cells without a moving lid | Fixed cap per cell: needle septum, sealed QRCE feedthrough, vent membrane |
| Reduce mixing during transport | Gas-separated segments with boundary portions diverted to waste |

## Unresolved experimental validation

Residual film and carryover; segment detection and dispensing accuracy; septum coring and reseal; vent wetting and reaction-gas pressure; QRCE drift; uncompensated resistance in an undivided two-electrode cell; gasket compression uniformity; cleaning cells, caps and the shared WE between runs. None is claimed solved by this animation.

## References and their limits

- [Gerroll et al., Legion](https://doi.org/10.1021/acsmeasuresciau.3c00022): source of the cell array and per-cell QRCE channel architecture. Legion's cells are open-top; the septum caps are an addition.
- [Laudadio et al.](https://doi.org/10.1007/s41981-018-0024-3): shared flat electrodes and insulating flow-defining layers.
- [AMPERE-2](https://doi.org/10.1039/D5DD00180C): robotic electrochemistry and bottom-of-well electrodes with seals; a different electrode arrangement.
- [Kreutzer et al.](https://doi.org/10.1021/ac702143r): liquid-film-related dispersion in gas–liquid segmented transport.

These sources support component principles. They do not validate this complete robot-loaded, septum-sealed design.
