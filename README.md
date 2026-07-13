# Beautiful Graph

Enhances Obsidian's native graph with directory-sensitive hover labels and optional position memory for the largest hub nodes.

## Features

- Formats `wiki/projects/index.md` as `wiki > projects` while hovering its graph node.
- Opens the native graph through the **Open directory-sensitive graph** command.
- Saves and restores positions for 0–20 high-weight graph hubs.
- Falls back to link degree when the native graph does not expose node weight.
- Keeps all native graph probing isolated and guarded.

## Build

```powershell
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `styles.css` into:

```text
<vault>/.obsidian/plugins/beautiful-graph/
```

Enable the plugin under **Settings → Community plugins**. Assign `Ctrl+G` to **Beautiful Graph: Open directory-sensitive graph** after removing any conflicting default binding.

## Settings

- Hover pill.
- Replace underscores.
- Pill color with automatic contrast text.
- Maximum label directories with middle-path ellipsis.
- Remember hub positions.
- Remembered hub count.
- Clear remembered positions.
- Debug logging.

## Limitations

Obsidian does not expose native graph hover state or physics nodes through its public API. This plugin probes guarded private runtime fields. Hover labels or position memory may require adapter updates after an Obsidian release. Enable debug logging and inspect the developer console when reporting an incompatibility.

Position restoration occurs shortly after native graph initialization. A visible settling adjustment may occur before the simulation stabilizes.
