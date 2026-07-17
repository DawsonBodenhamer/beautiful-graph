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
  const OUTPUT_ROOT = "dev/beautiful_graph/tests/fixtures/perf";
  const ARTIFACTS = ["main.js", "graph-worker.js", "graph-sim.wasm", "manifest.json", "styles.css"];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nowIso = () => new Date().toISOString();
  const round = (value) => Math.round(value * 1_000) / 1_000;

  function obsidianVersion() {
    const embedded=navigator.userAgent.match(/obsidian\/([^ ]+)/i)?.[1];
    try { return global.require?.("obsidian")?.getVersion?.() || app.version || embedded || "unknown"; }
    catch { return app.version || embedded || "unknown"; }
  }

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

  async function sha256(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function releaseMetadata(plugin, view, commit) {
    if (!/^[0-9a-f]{7,40}$/i.test(commit || "")) throw new Error("Pass the release-candidate commit, for example beautifulGraphBenchmark.run({ commit: \"abcdef0\" }).");
    const directory = plugin.manifest.dir || ".obsidian/plugins/beautiful-graph";
    const artifactHashes = {};
    for (const artifact of ARTIFACTS) artifactHashes[artifact] = await sha256(await app.vault.adapter.readBinary(`${directory}/${artifact}`));
    const captured = fixture(plugin, view);
    return {
      commit,
      topologyHash: captured.topologyHash,
      settingsHash: captured.settingsHash,
      artifactHashes,
      environment: captured.environment,
      runtime: view.getRuntimeDiagnostics(),
    };
  }

  function summarize(samples, longTasks, frameGaps, workerMessages, workerBytes, workerTicks, workerMemory) {
    return {
      sampleCount: samples.length,
      p95Ms: round(percentile95(samples)),
      maxMs: round(samples.length ? Math.max(...samples) : 0),
      longTaskCount: longTasks.length,
      longTaskMaxMs: round(longTasks.length ? Math.max(...longTasks) : 0),
      frameGapP95Ms:round(percentile95(frameGaps)),
      frameGapMaxMs:round(frameGaps.length?Math.max(...frameGaps):0),
      workerMessages,
      workerBytes,
      workerTickP95Ms: round(percentile95(workerTicks)),
      workerTickMaxMs: round(workerTicks.length ? Math.max(...workerTicks) : 0),
      workerTickSamples: workerTicks.length,
      workerHeapMinBytes: workerMemory.length ? Math.min(...workerMemory) : 0,
      workerHeapMaxBytes: workerMemory.length ? Math.max(...workerMemory) : 0,
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
      schema: 2,
      topologyHash:hash(JSON.stringify({nodes:nodes.map(node=>node.id),edges})),
      settingsHash:hash(JSON.stringify({forces:plugin.settings.forces,display:plugin.settings.display})),
      capturedAt: nowIso(),
      environment: {
        obsidian: obsidianVersion(),
        electron: navigator.userAgent.match(/Electron\/([^ ]+)/)?.[1] || "unknown",
        operatingSystem: navigator.userAgent,
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
      const frameGaps=[];
      let frameRunning=true,lastFrame=performance.now(),workerMessages=0,workerBytes=0;
      const workerTicks=[],workerMemory=[];
      const frame=now=>{frameGaps.push(now-lastFrame);lastFrame=now;if(frameRunning)requestAnimationFrame(frame)};requestAnimationFrame(frame);
      const worker=view.worker,onWorker=event=>{workerMessages++;workerBytes+=event.data?.coords?.byteLength||0;if(Number.isFinite(event.data?.metrics?.tickMs)&&event.data.metrics.tickMs>0)workerTicks.push(event.data.metrics.tickMs);if(Number.isFinite(event.data?.metrics?.heapBytes))workerMemory.push(event.data.metrics.heapBytes)};worker?.addEventListener("message",onWorker);
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
      let driveMetrics={};
      try {
        driveMetrics=await drive(view, RUN_MS, run)||{};
        while(performance.now()-started<RUN_MS)await new Promise(requestAnimationFrame);
      } finally {
        view.renderGraph = original;
        observer.disconnect();
        frameRunning=false;worker?.removeEventListener("message",onWorker);
      }
      runs.push({ run: run + 1, workload: name, ...summarize(samples, longTasks,frameGaps,workerMessages,workerBytes,workerTicks,workerMemory),...driveMetrics });
      await sleep(250);
    }
    return runs;
  }

  const workloads = {
    async physicsWake(view) {
      view.startActiveWorker(true);
      await sleep(RUN_MS);
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
    async rapidDrag(view,duration){
      const node=view.model.nodes.filter(node=>node.visible).sort((a,b)=>b.degree-a.degree)[0],canvas=view.pixi?.canvas,host=view.canvasHost;if(!node||!canvas||!host)throw new Error("Rapid-drag benchmark requires an active rendered node.");
      const rect=host.getBoundingClientRect(),pointerId=9173,startX=rect.left+view.offset.x+node.x*view.scale,startY=rect.top+view.offset.y+node.y*view.scale,inputLatency=[];
      canvas.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,composed:true,pointerId,button:0,buttons:1,clientX:startX,clientY:startY}));await new Promise(requestAnimationFrame);if(!view.dragged)throw new Error("Synthetic pointerdown did not enter the production drag path.");
      const started=performance.now();try{while(performance.now()-started<duration){const phase=(performance.now()-started)/180,x=startX+Math.sin(phase)*Math.min(420,rect.width*.3),y=startY+Math.cos(phase*1.37)*Math.min(280,rect.height*.25),sent=performance.now();canvas.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,composed:true,pointerId,button:-1,buttons:1,clientX:x,clientY:y}));await new Promise(resolve=>requestAnimationFrame(()=>{inputLatency.push(performance.now()-sent);resolve()}))}}finally{canvas.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,composed:true,pointerId,button:-1,buttons:1,clientX:startX,clientY:startY}));await new Promise(requestAnimationFrame);window.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId,button:0,buttons:0,clientX:startX,clientY:startY}));await new Promise(requestAnimationFrame);if(view.dragged)throw new Error("Rapid-drag benchmark failed to release pointer ownership.")}
      return{pointerToPaintP95Ms:round(percentile95(inputLatency)),pointerToPaintMaxMs:round(Math.max(...inputLatency)),pointerSampleCount:inputLatency.length};
    },
  };

  async function run(options = {}) {
    const { plugin, view } = context();
    const adapter = app.vault.adapter;
    await ensureDirectory(adapter, OUTPUT_ROOT);
    const host = view.contentEl;
    const previous = { width: host.style.width, height: host.style.height, maxWidth: host.style.maxWidth, maxHeight: host.style.maxHeight };
    Object.assign(host.style, { width: "1400px", height: "900px", maxWidth: "1400px", maxHeight: "900px" });
    const results = [];
    try {
      await sleep(WARMUP_MS);
      const capturedFixture = fixture(plugin, view);
      await adapter.write(`${OUTPUT_ROOT}/topology.json`, `${JSON.stringify(capturedFixture, null, 2)}\n`);
      for (const name of ["physicsWake","camera","gui"]) results.push(...await sampleWorkload(view, name, workloads[name]));
    } finally {
      Object.assign(host.style, previous);
    }
    const report = { schema: 3, capturedAt: nowIso(), ...(await releaseMetadata(plugin, view, options.commit)), protocol: { runs: RUNS, runMs: RUN_MS, warmupMs: WARMUP_MS, viewport:{width:1400,height:900},naturalPaintsOnly:true,p95: "sorted[ceil(0.95 * count) - 1]",workerTickP95TargetMs:16.667,mainLongTaskLimitMs:50,frameGapP95TargetMs:33 }, results };
    await adapter.write(`${OUTPUT_ROOT}/baseline.json`, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  }

  async function runRapidDrag(options = {}) {
    const { plugin, view } = context();
    const adapter = app.vault.adapter;
    await ensureDirectory(adapter, OUTPUT_ROOT);
    const host = view.contentEl;
    const previous = { width: host.style.width, height: host.style.height, maxWidth: host.style.maxWidth, maxHeight: host.style.maxHeight };
    Object.assign(host.style, { width: "1400px", height: "900px", maxWidth: "1400px", maxHeight: "900px" });
    try {
      await sleep(WARMUP_MS);
      const results = await sampleWorkload(view, "rapidDrag", workloads.rapidDrag);
      const report = { schema: 3, capturedAt: nowIso(), ...(await releaseMetadata(plugin, view, options.commit)), protocol: { runs: RUNS, runMs: RUN_MS, warmupMs: WARMUP_MS, viewport:{width:1400,height:900},naturalPaintsOnly:true,pointerToPaintP95TargetMs:33 }, results };
      await adapter.write(`${OUTPUT_ROOT}/rapid-drag.json`, `${JSON.stringify(report, null, 2)}\n`);
      return report;
    } finally {
      Object.assign(host.style, previous);
    }
  }

  async function runManualOpen(options = {}) {
    const { plugin } = context();
    const adapter = app.vault.adapter;
    await ensureDirectory(adapter, OUTPUT_ROOT);
    const runs=[];
    await sleep(1_000);
    for(let run=0;run<RUNS;run+=1){
      app.workspace.detachLeavesOfType("beautiful-graph");await new Promise(requestAnimationFrame);await sleep(50);const longTasks=[],longTaskEntries=[],frameGaps=[];let frameRunning=true,lastFrame=performance.now();const frame=now=>{frameGaps.push(now-lastFrame);lastFrame=now;if(frameRunning)requestAnimationFrame(frame)};requestAnimationFrame(frame);const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){longTasks.push(entry.duration);longTaskEntries.push({startTime:entry.startTime,duration:entry.duration})}});observer.observe({type:"longtask",buffered:false});const started=performance.now();await plugin.openGraph();
      const leaf=app.workspace.getLeavesOfType("beautiful-graph").at(-1),view=leaf?.view;if(!view?.getStartupMetrics)throw new Error("Manual-open benchmark could not find startup metrics.");
      while(!["complete","degraded"].includes(view.getStartupMetrics().phase))await new Promise(requestAnimationFrame);frameRunning=false;const metrics=view.getStartupMetrics(),stableMs=(metrics.presentationStableAt??performance.now())-started;
      const startupNodes=view.model.nodes.filter(node=>node.visible),startupIds=new Set(startupNodes.map(node=>node.id)),expectedEdges=view.model.edges.filter(edge=>startupIds.has(edge.source)&&startupIds.has(edge.target)).length,expectedLabels=startupNodes.filter(node=>node.alwaysLabel).length,initialOccupancy=metrics.initialCameraOccupancy??0,progressivePaint=metrics.finalNodeCount===startupNodes.length&&metrics.firstNodeCount>0&&metrics.firstNodeCount<=50&&(metrics.maxNodeBatch??0)>0&&(metrics.maxNodeBatch??0)<=50&&(metrics.lazyFrames??0)>0&&metrics.firstPaintReady===(metrics.finalNodeCount<=50)&&metrics.firstEdgeCount<=expectedEdges&&metrics.firstGroupLabelCount<=expectedLabels;
      observer.disconnect();const cameraScaleDrift=metrics.cameraScaleDrift??0,frameGapP95Ms=round(percentile95(frameGaps)),longTaskTimeline=longTaskEntries.map(entry=>({startMs:round(entry.startTime-started),durationMs:round(entry.duration)}));runs.push({run:run+1,workload:"manualOpenStartup",stableMs:round(stableMs),longTaskCount:longTasks.length,longTaskMaxMs:round(longTasks.length?Math.max(...longTasks):0),longTaskTimeline,frameGapP95Ms,initialOccupancy:round(initialOccupancy),progressivePaint,metrics,passed:metrics.phase==="complete"&&metrics.workerTerminal==="sleep"&&longTasks.every(duration=>duration<=50)&&frameGapP95Ms<33&&(metrics.postGapP95Jump??0)<=2&&metrics.workerGenerations===1&&metrics.topologyRebuilds===0&&progressivePaint&&initialOccupancy>=.84&&initialOccupancy<=.9&&cameraScaleDrift<.002});await sleep(250);
    }
    const finalView=app.workspace.getLeavesOfType("beautiful-graph").at(-1)?.view;
    const report={schema:3,capturedAt:nowIso(),...(await releaseMetadata(plugin,finalView,options.commit)),protocol:{runs:RUNS,startupTerminal:"worker-sleep",longTaskTargetMs:50,initialOccupancyRange:[.84,.9],maxNodesPerFrame:50,cameraScaleDriftTarget:.002},runs};await adapter.write(`${OUTPUT_ROOT}/manual-open.json`,`${JSON.stringify(report,null,2)}\n`);return report;
  }

  async function waitFor(predicate, timeoutMs = 2_000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (predicate()) return performance.now() - started;
      await sleep(20);
    }
    return timeoutMs;
  }

  async function runLiveBatch(options = {}) {
    const { plugin, view } = context();
    const root = "__beautiful_graph_benchmark__";
    const paths = Array.from({ length: 4 }, (_, index) => `${root}/event_${index + 1}.md`);
    const renamed = paths.map((path) => path.replace("event_", "renamed_"));
    const samples = [];
    const runtimeSamples=[];
    const sampleRuntime=label=>runtimeSamples.push({label,mainHeapBytes:performance.memory?.usedJSHeapSize??null,...view.getRuntimeDiagnostics()});
    const record = async (kind, action, committed) => {
      const started = performance.now();
      await action();
      const latency = await waitFor(committed);
      samples.push({ kind, latencyMs: round(latency), timedOut: latency >= 2_000, actionMs: round(performance.now() - started) });
    };
    try {
      sampleRuntime("before");
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
      sampleRuntime("after-actions");
    } finally {
      for (const path of [...paths, ...renamed]) {
        const file = app.vault.getAbstractFileByPath(path);
        if (file) await app.vault.delete(file, true);
      }
      const folder = app.vault.getAbstractFileByPath(root);
      if (folder) await app.vault.delete(folder, true);
      await sleep(1_000);sampleRuntime("after-cleanup");
    }
    const result = { schema:3,capturedAt: nowIso(),...(await releaseMetadata(plugin,view,options.commit)), eventCount: samples.length, p95Ms: round(percentile95(samples.map((sample) => sample.latencyMs))), maxMs: round(Math.max(...samples.map((sample) => sample.latencyMs))), timedOut: samples.filter((sample) => sample.timedOut).length, runtimeSamples, samples };
    await app.vault.adapter.write(`${OUTPUT_ROOT}/live-baseline.json`, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  }

  async function runIdleAudit(options = {}) {
    const {plugin,view}=context();
    const adapter=app.vault.adapter;
    await ensureDirectory(adapter,OUTPUT_ROOT);
    while(view.getStartupMetrics().phase==="settling")await sleep(50);
    await sleep(1_500);
    const worker=view.worker;
    let workerMessages=0;
    const onWorker=()=>workerMessages++;
    worker?.addEventListener("message",onWorker);
    const idleStarted=performance.now();
    await sleep(1_000);
    const idle={durationMs:round(performance.now()-idleStarted),workerMessages,renderFrame:view.renderFrame,workerTerminal:view.getStartupMetrics().workerTerminal};
    view.renderGraph();
    await new Promise(requestAnimationFrame);
    const rendererWake={renderFrame:view.renderFrame,workerMessages};
    worker?.removeEventListener("message",onWorker);
    const report={schema:3,capturedAt:nowIso(),...(await releaseMetadata(plugin,view,options.commit)),idle,rendererWake,passed:idle.workerTerminal==="sleep"&&idle.workerMessages===0&&idle.renderFrame===0&&rendererWake.renderFrame!==0&&rendererWake.workerMessages===0};
    await adapter.write(`${OUTPUT_ROOT}/idle-audit.json`,`${JSON.stringify(report,null,2)}\n`);
    return report;
  }

  global.beautifulGraphBenchmark = Object.freeze({ run, runManualOpen, runRapidDrag, runLiveBatch, runIdleAudit, fixture: () => fixture(context().plugin, context().view) });
})(window);
