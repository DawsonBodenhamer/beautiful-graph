/*
 * Beautiful Graph renderer benchmark harness.
 *
 * Run only from Obsidian's developer console with a Beautiful Graph view open:
 *   await beautifulGraphBenchmark.run()
 *
 * The harness is intentionally outside src/. It does not ship in main.js and does
 * not alter production behavior. Results are written into tests/fixtures/perf/.
 */
(function installBeautifulGraphBenchmark(global) {
  "use strict";

  const RUN_MS = 20_000;
  const RUNS = 3;
  const WARMUP_MS = 5_000;
  const MIN_SAMPLES = 300;
  const OUTPUT_ROOT = "dev/beautiful_graph/tests/fixtures/perf";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nowIso = () => new Date().toISOString();
  const round = (value) => Math.round(value * 1_000) / 1_000;

  function hash(value) {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return (result >>> 0).toString(16).padStart(8, "0");
  }

  function percentile95(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.ceil(0.95 * sorted.length) - 1];
  }

  function summarize(samples, longTasks) {
    return {
      sampleCount: samples.length,
      p95Ms: round(percentile95(samples)),
      maxMs: round(samples.length ? Math.max(...samples) : 0),
      longTaskCount: longTasks.length,
      longTaskMaxMs: round(longTasks.length ? Math.max(...longTasks) : 0),
    };
  }

  function context() {
    const plugin = app.plugins.plugins["beautiful-graph"];
    const leaves = app.workspace.getLeavesOfType("beautiful-graph");
    const view = leaves.find((leaf) => leaf.view?.model)?.view;
    if (!plugin || !view) throw new Error("Open a Beautiful Graph view before running the benchmark.");
    return { plugin, view };
  }

  async function ensureDirectory(adapter, path) {
    const parts = path.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await adapter.exists(current))) await adapter.mkdir(current);
    }
  }

  function fixture(plugin, view) {
    const nodes = view.model.nodes.map((node) => ({
      id: hash(node.id),
      folder: hash(node.folder || "root"),
      degree: node.degree,
      baseRadius: round(node.baseRadius),
      radius: round(node.radius),
      x: round(node.x),
      y: round(node.y),
    })).sort((a, b) => a.id.localeCompare(b.id));
    const ids = new Map(view.model.nodes.map((node) => [node.id, hash(node.id)]));
    const edges = view.model.edges.map((edge) => ({ source: ids.get(edge.source), target: ids.get(edge.target) }))
      .sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
    return {
      schema: 1,
      capturedAt: nowIso(),
      baselineCommit: "6f8e351",
      environment: {
        obsidian: global.require?.("obsidian")?.getVersion?.() || app.version || "unknown",
        electron: navigator.userAgent.match(/Electron\/([^ ]+)/)?.[1] || "unknown",
        devicePixelRatio: global.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency,
        platform: navigator.platform,
        viewport: { width: 1400, height: 900 },
      },
      settings: {
        forces: structuredClone(plugin.settings.forces),
        display: structuredClone(plugin.settings.display),
      },
      nodes,
      edges,
    };
  }

  async function sampleWorkload(view, name, drive) {
    const runs = [];
    for (let run = 0; run < RUNS; run += 1) {
      const samples = [];
      const longTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      observer.observe({ type: "longtask", buffered: false });
      const original = view.renderGraph;
      view.renderGraph = function measuredRenderGraph(...args) {
        const started = performance.now();
        try { return original.apply(this, args); }
        finally { samples.push(performance.now() - started); }
      };
      const started = performance.now();
      try {
        await drive(view, RUN_MS, run);
        while (performance.now() - started < RUN_MS || samples.length < MIN_SAMPLES) {
          view.renderGraph();
          await new Promise(requestAnimationFrame);
        }
      } finally {
        view.renderGraph = original;
        observer.disconnect();
      }
      runs.push({ run: run + 1, workload: name, ...summarize(samples, longTasks) });
      await sleep(250);
    }
    return runs;
  }

  const workloads = {
    async startup(view) {
      view.rebuild(false);
      await sleep(RUN_MS);
    },
    async motion(view, duration) {
      view.updateForces(true);
      const end = performance.now() + duration;
      while (performance.now() < end) {
        view.updateForces(true);
        await sleep(1000);
      }
    },
    async camera(view, duration) {
      const initial = { scale: view.scale, offset: { ...view.offset } };
      const start = performance.now();
      try {
        while (performance.now() - start < duration) {
          const phase = (performance.now() - start) / 1000;
          view.scale = initial.scale * (1 + Math.sin(phase * 1.7) * 0.15);
          view.offset = { x: initial.offset.x + Math.sin(phase) * 80, y: initial.offset.y + Math.cos(phase * 1.3) * 60 };
          view.applyCameraTransform();
          view.renderGraph();
          await new Promise(requestAnimationFrame);
        }
      } finally {
        view.scale = initial.scale;
        view.offset = initial.offset;
        view.applyCameraTransform();
      }
    },
    async gui(view, duration) {
      const panels = [...view.contentEl.querySelectorAll(".beautiful-graph-panel")];
      const start = performance.now();
      let index = 0;
      while (performance.now() - start < duration) {
        const panel = panels[index++ % panels.length];
        panel?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 10, clientY: 10 }));
        view.renderGraph();
        await new Promise(requestAnimationFrame);
      }
    },
  };

  async function run() {
    const { plugin, view } = context();
    const adapter = app.vault.adapter;
    await ensureDirectory(adapter, OUTPUT_ROOT);
    const host = view.contentEl;
    const previous = { width: host.style.width, height: host.style.height, maxWidth: host.style.maxWidth, maxHeight: host.style.maxHeight };
    Object.assign(host.style, { width: "1400px", height: "900px", maxWidth: "1400px", maxHeight: "900px" });
    await sleep(WARMUP_MS);
    const capturedFixture = fixture(plugin, view);
    await adapter.write(`${OUTPUT_ROOT}/topology.json`, `${JSON.stringify(capturedFixture, null, 2)}\n`);
    const results = [];
    try {
      for (const [name, drive] of Object.entries(workloads)) results.push(...await sampleWorkload(view, name, drive));
    } finally {
      Object.assign(host.style, previous);
    }
    const report = { schema: 1, capturedAt: nowIso(), protocol: { runs: RUNS, runMs: RUN_MS, warmupMs: WARMUP_MS, minSamples: MIN_SAMPLES, p95: "sorted[ceil(0.95 * count) - 1]" }, results };
    await adapter.write(`${OUTPUT_ROOT}/baseline.json`, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  }

  async function waitFor(predicate, timeoutMs = 2_000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (predicate()) return performance.now() - started;
      await sleep(20);
    }
    return timeoutMs;
  }

  async function runLiveBatch() {
    const { view } = context();
    const root = "__beautiful_graph_benchmark__";
    const paths = Array.from({ length: 4 }, (_, index) => `${root}/event_${index + 1}.md`);
    const renamed = paths.map((path) => path.replace("event_", "renamed_"));
    const samples = [];
    const record = async (kind, action, committed) => {
      const started = performance.now();
      await action();
      const latency = await waitFor(committed);
      samples.push({ kind, latencyMs: round(latency), timedOut: latency >= 2_000, actionMs: round(performance.now() - started) });
    };
    try {
      if (!app.vault.getAbstractFileByPath(root)) await app.vault.createFolder(root);
      for (const path of paths) await record("create", () => app.vault.create(path, "# Benchmark\n"), () => view.model.nodes.some((node) => node.id === path));
      for (let index = 0; index < paths.length; index += 1) {
        const path = paths[index];
        await record("content-modify", async () => {
          const file = app.vault.getAbstractFileByPath(path);
          await app.vault.modify(file, `---\ndescription: benchmark-${index}\n---\n# Benchmark\n`);
        }, () => view.model.nodes.find((node) => node.id === path)?.description === `benchmark-${index}`);
      }
      for (let index = 0; index < paths.length; index += 1) {
        const path = paths[index];
        const target = paths[(index + 1) % paths.length];
        await record("link-modify", async () => {
          const file = app.vault.getAbstractFileByPath(path);
          await app.vault.modify(file, `---\ndescription: benchmark-${index}\n---\n[[${target.replace(/\.md$/, "")}]]\n`);
        }, () => view.model.edges.some((edge) => edge.source === path && edge.target === target || edge.source === target && edge.target === path));
      }
      for (let index = 0; index < paths.length; index += 1) {
        const from = paths[index];
        const to = renamed[index];
        await record("rename", async () => app.fileManager.renameFile(app.vault.getAbstractFileByPath(from), to), () => view.model.nodes.some((node) => node.id === to) && !view.model.nodes.some((node) => node.id === from));
      }
      for (const path of renamed) await record("delete", async () => app.vault.delete(app.vault.getAbstractFileByPath(path), true), () => !view.model.nodes.some((node) => node.id === path));
    } finally {
      for (const path of [...paths, ...renamed]) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file) await app.vault.delete(file, true);
      }
      const folder = app.vault.getAbstractFileByPath(root);
      if (folder) await app.vault.delete(folder, true);
    }
    const result = { capturedAt: nowIso(), eventCount: samples.length, p95Ms: round(percentile95(samples.map((sample) => sample.latencyMs))), maxMs: round(Math.max(...samples.map((sample) => sample.latencyMs))), timedOut: samples.filter((sample) => sample.timedOut).length, samples };
    await app.vault.adapter.write(`${OUTPUT_ROOT}/live-baseline.json`, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  }

  global.beautifulGraphBenchmark = Object.freeze({ run, runLiveBatch, fixture: () => fixture(context().plugin, context().view) });
})(window);
