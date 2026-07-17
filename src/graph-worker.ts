import {readFile} from "node:fs/promises";
import {parentPort,workerData} from "node:worker_threads";
import {createGraphWorkerRuntime} from "./worker-runtime.ts";
import {createPreferredSimulationEngine} from "./wasm-simulation-engine.ts";

const port=parentPort,data=workerData as {wasmPath?:unknown};
if(!port)throw new Error("Beautiful Graph physics must run in a worker thread.");
if(typeof data.wasmPath!=="string"||!data.wasmPath)throw new Error("Beautiful Graph worker did not receive graph-sim.wasm.");

const runtime=createGraphWorkerRuntime({
  post:(message,transfer)=>port.postMessage(message,transfer as never[]|undefined),
  setTimer:(callback,delay)=>setTimeout(callback,delay),
  clearTimer:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>),
  createEngine:async()=>createPreferredSimulationEngine(await readFile(data.wasmPath as string)),
});
port.on("message",message=>runtime.onMessage(message));
