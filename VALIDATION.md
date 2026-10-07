# Verification record

The checks validate this software visualization only; they do not validate hardware performance.

## Automated checks

`npm run typecheck`, `npm test` and `npm run build`.

The six controller/geometry tests cover:

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

## Browser checks

Verified using the Codex in-app Chromium browser (Edge was not exposed by this session's browser connector):

- Full automatic loading ends with three 80 μL fills, parked nozzle, CLAMPED lid, IMMERSED upper electrode, 1.00 mm clearance and stopped flow.
- Pause / resume completes the same queued sequence.
- Assembled / exploded inspection, labels, dimensions, lid/frame visibility and longitudinal cross-section.
- Invalid 150 μL default-geometry doses show per-well warnings and disable automatic loading.
- Presentation mode enters and exits.
- Desktop layout and 390 px responsive viewport; no document horizontal overflow. The compact fluidic schematic has its own horizontal scroll region.
- Five reference links and scoped descriptions are available in Design notes.
- Section 01 retains the original robot/electrode scene without the upstream reservoirs/pump. Section 02 shows only the fluidic subsystem in 3D (or its 2D schematic). Section 03 separately combines the full system. All views consume the same machine state; pause stops flow and automatic loading still conserves three 80 μL well fills.

## Geometry inspection

The frame is one extruded solid with individual rounded through-holes. The continuous WE plate is one box beneath them. The common CE plate is one solid with separate connected broad protrusions. Each submerged liquid has a through-hole matching its protrusion above the tip, plus a full liquid layer below the tip. No geometry or controller contains an inter-well liquid connection. Only one continuous flexible tube path reaches the nozzle; colored internal meshes visualize its contents rather than additional tubes.

The dry terminals are illustrative connection tabs without an electrical solver. Cutaways, transparency and exploded offsets are inspection tools. No reaction starts after closure.
