# Legion-style cell array — potentiostat connection proposal

Selected scope: 2 rows × 3 columns of sealed cells on one common glassy-carbon working electrode (WE), with one Ag quasi-reference counter electrode (QRCE) per cell and **one potentiostat channel per QRCE**. This follows Legion (Gerroll, Kulesa, Ault & Baker, *ACS Meas. Sci. Au* 2023, 3, 371–379), where each QRCE's potential is set individually and its current is measured independently; the common WE is the shared return. Each cell is a two-electrode, undivided measurement: the QRCE acts as both reference and counter electrode.

Rows share formulations column-wise. Row R1 cells run at E₁ and row R2 cells at E₂. Because every cell has its own channel, any cell can be given a different waveform later without rewiring.

## Wiring

| Function | Connection |
| --- | --- |
| Common WE | Copper contact plate under the glassy carbon, tab J-WE, to the instrument's common/ground return |
| Channel n (n = 1…6) | QRCE wire of one cell, through its sealed cap feedthrough, to pin n of the QRCE header |
| Channel mapping | R1·A → 1, R2·A → 2, R1·B → 3, R2·B → 4, R1·C → 5, R2·C → 6 |
| Shield / chassis | Per the instrument's instructions; never assume this is an electrode lead |

In Legion, each 8-channel board serves one column of 8 QRCEs, and twelve boards interface with an FPGA. A 6-cell demonstrator needs one board, or six channels of a commercial multichannel potentiostat that can share a common WE. Confirm that the chosen instrument supports a common-WE configuration before wiring; many multichannel instruments assume floating, fully separate cells.

## Cell construction

- PEEK block with Ø7 mm bores at 9 mm pitch; PDMS gasket with Ø6 mm openings defines 28.3 mm² of exposed glassy carbon per cell.
- Glassy-carbon plate 3 mm thick on a copper contact plate and PEEK base; four corner screws compress the stack. Keep gasket compression uniform so no cell leaks into its neighbour.
- QRCE: Ø1 mm Ag wire. Chloridize for aqueous work (Legion: 1 M FeCl₃ in 1 M HCl, 5 s) or use Ag/AgO for non-aqueous work. The tip sits about 2 mm above the WE.
- Fixed cap per cell (an addition to Legion, whose cells are open): self-sealing septum for the dispensing needle, a sealed feedthrough for the QRCE, and a hydrophobic vent so displaced air escapes during filling. Copper and connector hardware stay outside the liquid.

## Operating interlock

Keep all channels OFF during dispensing, gas discharge and robot travel. Apply potentials only after the nozzle has parked clear of the septa and fills have been confirmed. Switch outputs off before the needle re-enters any cell. A real implementation needs verified park sensing and an instrument-supported output-enable; the browser animation is not that safety controller.

## Electrical checkout before chemistry

1. With the instrument disconnected and the array dry, check continuity from J-WE to the glassy carbon and from each header pin to its own QRCE. Check insulation between every pair of QRCEs and between each QRCE and the WE.
2. Use the instrument's dummy cell to confirm wiring and polarity on each channel.
3. Put a resistor (e.g. 10 kΩ) from each header pin to J-WE. At 0.10 V each channel should read about 10 μA on its own; a reading on a channel that has no resistor indicates crosstalk or a wiring fault.
4. Fill the cells with electrolyte only and check that each channel reads only its own cell. Leave one cell empty to confirm it reads open-circuit.
5. Benchmark with a redox probe such as 0.5 mM K₃Fe(CN)₆ in 0.1 M KCl, as Legion did, and compare peak currents and peak separations across the six cells before any screening.

## Measurement boundary

Potentials are quoted against each cell's QRCE, not a true reference electrode, so they drift with QRCE surface state and solution composition. Current passing through the QRCE can change that surface over long electrolyses. Uncompensated resistance differs between formulations. Treat E₁ and E₂ as nominal setpoints and calibrate them against a reference measurement when absolute potentials matter.

Source: [Gerroll et al., Legion: An Instrument for High-Throughput Electrochemistry](https://doi.org/10.1021/acsmeasuresciau.3c00022). It documents the open-top array and its electronics; it does not validate the septum caps or robotic loading proposed here.
