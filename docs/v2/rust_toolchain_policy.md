# Rust and WebAssembly Toolchain Policy

`rust-toolchain.toml` is authoritative. Beautiful Graph V2 uses Rust `1.88.0`, the `wasm32-unknown-unknown` target, `rustfmt`, and Clippy.

The simulation crate will use a small versioned C-compatible ABI and no JavaScript binding generator unless a reviewed requirement proves one necessary. Rust owns simulation kernels and reusable simulation memory. JavaScript owns scheduling, messages, transport, worker lifecycle, and engine selection.

Rules:

- Commit `Cargo.lock` and pin every direct dependency exactly.
- Prefer the standard library and dependency-free kernels.
- Deny warnings in CI. Run formatting, Clippy, native tests, Wasm build, ABI tests, and shared conformance fixtures.
- Isolate every `unsafe` block behind bounds-checked functions and document its invariant.
- Export ABI version, allocation/capacity operations, topology load, simulation tick, completion/integration, and finite-state validation only as required.
- Treat initialization or ABI failure as an engine-selection failure. Do not switch engines after simulation begins.
- Reproduce builds from a clean checkout before release and hash `graph-sim.wasm` in the artifact manifest output.

