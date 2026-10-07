# Verification record

The checks validate this software visualization only; they do not validate hardware performance.

## Automated checks

`npm run typecheck`, `npm test` and `npm run build`.

The eleven controller/geometry/gas tests cover:

- Full A/B/C sequence, correct well addresses and usable fills.
- Gas/boundary discharge only at waste; no dispensing during robot travel.
- Travel clearance above the well rim and below the raised protrusions; park before closure.
- Numerical volume conservation through lid lowering, positive bottom clearance and no overflow.
- Manual ordering and lid, station and flush interlocks.
- Pause freezing geometry, elapsed time and volumes while gas/pump/flow stop and anti-drip closes.
- Flush preserving the well fills; visualization reset restoring empty wells and raised lid.
- Rejection of overflow, dry protrusions, bottom contact and sidewall interference.
- One to three active wells with Air, N2 and Ar.
- Volume-derived segment lengths and default submerged-electrode displacement.
- Circular and rectangular channel area, explicit μL/s and ms conversions, time-control and target-length modes.
- Gas-segment growth at the inlet, closing at programmed time, pause freezing injection and liquid/gas non-overlap.
- Generation stopping before transport, manual dispensing blocked until transport, and whole-train transport preserving segment volumes/order.
- Calibration from a completed injection snapshot; no default measured values and no retroactive changes to slug volumes.
- Segment path coordinates remain within spline bounds during fractional creation and transport (floating-point boundary regression).

## Browser checks

Verified using the Codex in-app Chromium browser (Edge was not exposed by this session's browser connector):

- Full automatic loading ends with three 80 μL fills, parked nozzle, CLAMPED lid, IMMERSED upper electrode, 1.00 mm clearance and stopped flow.
- Pause / resume completes the same queued sequence.
- Assembled / exploded inspection, labels, dimensions, lid/frame visibility and longitudinal cross-section.
- Invalid 150 μL default-geometry doses show per-well warnings and disable automatic loading.
- Presentation mode enters and exits.
- Desktop layout and 390 px responsive viewport; no document horizontal overflow. The compact fluidic schematic has its own horizontal scroll region.
- Five reference links and scoped descriptions are available in Design notes.
- Section 01 retains the robot/electrode scene with the updated gas module but without the upstream precursor reservoirs/pump. Section 02 shows only the fluidic subsystem in 3D (or its 2D schematic). Section 03 separately combines the full system. All views consume the same machine state.
- Browser input checks: a 2 s test injection pauses with the valve CLOSED and resumes with OPEN / liquid pump OFF; a manually entered demonstration value exercises calibration without being treated as experimental validation.
- A 5 mm target with a 1 mm circular ID calculates 3.927 μL and approximately 98.17 ms at 40 μL/s. A 2 × 0.5 mm rectangular channel calculates 5 μL and 125 ms. Generation completes with well dispensing disabled until Transport Train.

## Geometry inspection

The frame is one extruded solid with individual rounded through-holes. The continuous WE plate is one box beneath them. The common CE plate is one solid with separate connected broad protrusions. Each submerged liquid has a through-hole matching its protrusion above the tip, plus a full liquid layer below the tip. No geometry or controller contains an inter-well liquid connection. Only one continuous flexible tube path reaches the nozzle; colored internal meshes visualize its contents rather than additional tubes.

The dry terminals are illustrative connection tabs without an electrical solver. Cutaways, transparency and exploded offsets are inspection tools. No reaction starts after closure.
