# Beautiful Graph

A GPU-rendered, directory-sensitive knowledge graph for Obsidian.

Beautiful Graph provides its own PixiJS view, worker-based layout, directory Groups, Folder Lens contours, search, semantic focus, live controls, and persistent anchor positions. It is designed for large Markdown vaults where repeated filenames such as `index.md` need folder context.

## Features

- Dedicated graph tab opened from the command palette or ribbon.
- Directory-aware labels and special presentation for Group indexes and the vault root index.
- Topology-led worker physics with collision handling, bounded convergence, and failure recovery.
- Persistent positions for the 5-100 largest nodes; other nodes animate from deterministic family-local seeds.
- Directory Groups with visibility, colors, icons, palettes, automatic analysis, presets, and File Explorer context actions.
- Smooth translucent Folder Lens contours toggled from Group names.
- Search with optional linked-note context.
- Persistent single-root and multi-root focus with direct-neighbor emphasis.
- Responsive Groups, Forces, and Display panels with pinning, collapse, reset, presets, and undo/redo.
- Batched live updates for file, metadata, and topology changes.

## Installation

Requires Node.js and npm for local builds.

```powershell
npm install
npm run build
```

Copy these files into `<vault>/.obsidian/plugins/beautiful-graph/`:

```text
manifest.json
main.js
styles.css
```

Enable **Beautiful Graph** under **Settings -> Community plugins**.

Run **Beautiful Graph: Open Beautiful Graph** from the command palette. A custom hotkey such as `Ctrl+G` can be assigned in Obsidian's hotkey settings.

## Controls

| Input | Action |
|---|---|
| Mouse wheel | Smooth cursor-anchored zoom. |
| Left-drag background | Pan the graph. |
| Left-drag node | Move the node and couple it to live physics. |
| Click node | Pin focus to that node and its direct neighbors. |
| Shift-click node | Add or remove a focus root. |
| Ctrl-click node | Open the note in a new tab. |
| Double-click node | Open the note. |
| Space | Recenter the active graph. |
| Type while the graph is focused | Focus the graph search field. |
| Escape in search | Clear the search. |
| Ctrl+Z | Undo graph settings. |
| Ctrl+Shift+Z or Ctrl+Y | Redo graph settings. |

The bottom toolbar also exposes Undo, Redo, and Recenter Graph. On constrained viewports, use `G`, `F`, and `D` in the GUI dock to switch between panels.

## On-Graph Panels

### Groups

- Toggle all Groups or individual directories.
- Edit Group colors and single-grapheme icons.
- Click a Group name to toggle its Folder Lens.
- Cycle palettes.
- Run **Analyze & Auto Group**.
- Load, save, and delete Group presets.
- Configure Everything or Everything Else and Root Index styling.

Folders also receive Beautiful Graph actions in the Obsidian File Explorer context menu.

### Forces

- Center Force.
- Repel Force.
- Sibling Force.
- Root Force.
- Link Force.
- Link Distance.
- Link Curve.
- Reset Forces, Analyze & Tune, and named presets.

Numeric readouts support horizontal scrubbing, Shift for precision, Ctrl for coarse adjustment, double-click text entry, Escape to cancel, and the reset icon for exact zero.

### Display

- Text Fade.
- Node Size.
- Link Size.
- Glow and Glow Size.
- Show Sibling Links.
- Show Orphans.
- Center Focused Node.
- Reset Display, Analyze & Tune, and named presets.

## Plugin Settings

- Replace underscores.
- Capitalize directory names.
- Saved anchor nodes: 5-100.
- Undo history size: 10-200.
- Reset panel layout.
- Clear saved layout.

Most visual and physics controls live on the graph so changes can be previewed immediately.

## Development

```powershell
npm test
npm run build
npm run benchmark:check
```

- `npm test` runs the TypeScript test suite with Node's test runner.
- `npm run build` performs strict TypeScript validation and creates the production bundle.
- `npm run benchmark:check` validates the benchmark harness syntax.
- `npm run dev` starts the development esbuild configuration.

Generated bundles, dependencies, diagnostics, coverage, and code-intelligence caches are intentionally untracked.

## Architecture

- `src/main.ts`: plugin lifecycle, settings, view registration, persistence, and File Explorer integration.
- `src/graph-view.ts`: PixiJS scene, panels, camera, interaction, search, focus, labels, and live updates.
- `src/graph-model.ts`: Markdown and metadata graph extraction.
- `src/physics-worker.ts`: worker layout and convergence lifecycle.
- Focused helper modules contain force kernels, persistence, migration, presentation, Groups, Folder Lens, camera, label, tether, and control logic.
- `tests/`: unit, migration, generated-worker, and regression coverage.
- `tools/benchmark-harness.js`: reproducible interaction benchmark harness.

## Current Limitations

- The historical minimap requirement is not implemented in version 1.0.0.
- File Explorer selection integration observes Obsidian DOM elements and may need adjustment after Obsidian UI changes.
- Layout and performance depend on vault topology, metadata quality, device capability, and active settings.
- Final visual acceptance for the latest presentation revision is performed manually after an Obsidian reload or restart.

Project decisions and current verification state are documented in `../../wiki/projects/beautiful_graph/`.
