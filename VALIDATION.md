# Verification record

The checks validate this software visualization only; they do not validate hardware performance.

## Automated checks

`npm run typecheck`, `npm test` and `npm run build`.

The twelve controller/geometry/gas tests cover:

- Full sequence visiting R1·A, R2·A, R1·B, R2·B, R1·C, R2·C in order, each at its septum position, with 300 μL in every cell.
- Gas/boundary discharge only at waste; no dispensing during robot travel; the robot never drops below the caps.
- Outputs stay off during all fluidic and robot steps; potentials are applied only after parking with valid fills.
- Manual ordering, output, station and flush interlocks; Cell Outputs Off re-enables fluidics.
- One column slug shared by both rows, never overfilling a cell.
- Pause freezing geometry, elapsed time and volumes while gas/pump/flow stop and anti-drip closes; reset restores empty cells with outputs off.
- Rejection of overfill, dry QRCE, oversize bore and out-of-range potentials.
- One to three columns (× 2 rows) with Air, N2 and Ar.
- Liquid-height volume balance including QRCE wire displacement; volume-derived segment lengths.
- Circular and rectangular channel area, explicit μL/s and ms conversions, time-control and target-length modes.
- Gas-segment growth at the inlet, closing at programmed time, pause freezing injection and liquid/gas non-overlap.
- Generation stopping before transport, manual dispensing blocked until transport, and whole-train transport preserving segment volumes/order.
- Calibration from a completed injection snapshot; no default measured values and no retroactive changes to slug volumes.
- Segment path coordinates remain within spline bounds during fractional creation and transport.

## Browser checks

Verified in the Claude desktop app's browser pane against `npm run dev`:

- Full automatic loading ends with six 300 μL fills, parked nozzle, outputs ON, QRCEs IMMERSED, R1 −0.80 V / R2 −1.20 V, 5.92 mm immersion / 6.08 mm headspace and stopped flow.
- QRCE leads and channel indicators change colour when potentials are applied.
- Assembled and exploded inspection; cross-section through the R2 cell centres shows liquid columns, immersed QRCE wires, septa and caps.

Not re-run after the Legion redesign: pause / resume in the browser, presentation mode, the 390 px responsive layout and the invalid-geometry warning display.

## Geometry inspection

The PEEK cell block is one extruded solid with six circular through-bores; the PDMS gasket is one solid with Ø6 mm openings; the glassy-carbon WE, copper plate and PEEK base are solid plates beneath them. Each cell has its own cap, septum, QRCE feedthrough and vent, and its own QRCE lead to the header. No geometry or controller contains an inter-cell liquid connection. Only one continuous flexible tube path reaches the nozzle; coloured internal meshes visualize its contents rather than additional tubes.

The header, channel board and copper tab are illustrative, without an electrical solver. Cutaways, transparency and exploded offsets are inspection tools. No reaction is simulated after potentials are applied.
