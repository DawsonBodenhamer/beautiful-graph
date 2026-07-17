# Beautiful Graph 2.0 Conformance Specification

This directory is the executable boundary for the V2 physics and rendering rewrite. The canonical product plan remains `../../../wiki/projects/beautiful_graph/beautiful_graph_plan.md`.

## Authority

Audited behavior comes from `../../../wiki/projects/beautiful_graph/obsidian_default_graph_physics.md`. Tests and fixtures cite headings from that note through `parity_matrix.json` instead of duplicating source evidence.

## Fixture Contract

`../../tests/fixtures/conformance/scenarios.json` contains topology and numeric simulation state only. It must not contain vault paths, note titles, note bodies, folder names, or presentation metadata.

Node order is protocol-significant. Coordinates, velocities, fixed coordinates, weights, and effective collision radii are finite numbers. A missing fixed coordinate is represented by `null`.

The same fixture scenarios will drive both the Rust/Wasm and JavaScript engines. Engine-specific expected values are prohibited. Exact scalar rules use exact assertions. Approximate force results use a fixture-owned tolerance and compare both engines to the same expected result.

## Versioning

- Fixture schema: `1`.
- Worker protocol: `1`.
- Wasm ABI: `1`.
- Artifact manifest: `1`.

Any incompatible change increments the affected version and adds migration or rejection tests. Unknown versions fail closed.

## Failure Boundary

Non-finite input or output, stale topology generations, malformed messages, and ABI mismatches are explicit errors. Runtime worker failure freezes the last finite renderer coordinates. Physics never falls back to the UI thread.

