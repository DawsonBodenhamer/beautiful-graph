import {createGraphWorkerRuntime} from "./worker-runtime.ts";
import {createPreferredSimulationEngine} from "./wasm-simulation-engine.ts";

const scope=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void;setTimeout:(callback:()=>void,delay:number)=>number;clearTimeout:(timer:number)=>void;onmessage:((event:MessageEvent)=>void)|null};
const runtime=createGraphWorkerRuntime({
  post:(message,transfer)=>scope.postMessage(message,transfer??[]),
  setTimer:(callback,delay)=>scope.setTimeout(callback,delay),
  clearTimer:timer=>scope.clearTimeout(timer as number),
  createEngine:()=>createPreferredSimulationEngine(new URL("graph-sim.wasm",self.location.href)),
});
scope.onmessage=event=>runtime.onMessage(event.data);
