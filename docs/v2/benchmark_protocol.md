# Beautiful Graph 2.0 Benchmark Protocol

## Fixed Workload

- Representative topology: the checked-in approximately 1,061-node hashed fixture in `tests/fixtures/perf/topology.json`.
- Viewport: `1400 x 900` CSS pixels.
- Runs: three after one warm-up period.
- Active run duration: five seconds per workload unless the workload has an explicit lifecycle terminal.
- Percentile: sort ascending and select `ceil(0.95 * sampleCount) - 1`.
- Engines: production Wasm, forced JavaScript fallback, and transport fallback where SharedArrayBuffer is unavailable.

## Required Metadata

Each report records hardware, operating system, Obsidian version, Electron version, device-pixel ratio, viewport, engine, transport, topology hash, settings hash, artifact hashes, commit, warm-up duration, run duration, and sample count.

## Gates

- Worker computation stays within the agreed target tick budget at the recorded percentile.
- No main-thread task exceeds `50 ms`.
- Active-motion frame-gap p95 is below `33 ms`.
- Drag input-to-paint p95 is below `33 ms`.
- Worker and renderer can be forced to sleep independently and schedule no further work until an allowed wake event.
- Per-tick allocation is bounded. Reconciliation may grow capacity but repeated equal-size reconciliation must not leak.

The target worker-tick percentile and budget must be recorded before final performance acceptance on the target hardware. Results without all required metadata are diagnostic only.

## Workloads

Startup, active motion, rapid drag, pan/zoom, topology add/remove, visibility reconciliation, force changes, worker sleep/wake, renderer sleep/wake, and repeated capacity-stable topology reconciliation.

