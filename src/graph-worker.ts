import {GRAPH_WORKER_BOOTSTRAP} from "./worker-bootstrap.ts";
import {createGraphWorkerRuntime} from "./worker-runtime.ts";
import {createPreferredSimulationEngine} from "./wasm-simulation-engine.ts";

type BootstrapMessage={type:typeof GRAPH_WORKER_BOOTSTRAP;wasm:ArrayBuffer};
const scope=self as unknown as {postMessage:(message:unknown,transfer?:Transferable[])=>void;setTimeout:(callback:()=>void,delay:number)=>number;clearTimeout:(timer:number)=>void;onmessage:((event:MessageEvent)=>void)|null};
let runtime:ReturnType<typeof createGraphWorkerRuntime>|undefined;
const pending:unknown[]=[];

function bootstrap(wasm:ArrayBuffer):void {
  if(runtime)return;
  runtime=createGraphWorkerRuntime({
    post:(message,transfer)=>scope.postMessage(message,transfer??[]),
    setTimer:(callback,delay)=>scope.setTimeout(callback,delay),
    clearTimer:timer=>scope.clearTimeout(timer as number),
    createEngine:()=>createPreferredSimulationEngine(wasm),
  });
  for(const message of pending.splice(0))runtime.onMessage(message);
}

scope.onmessage=event=>{
  const message=event.data as Partial<BootstrapMessage>;
  if(message?.type===GRAPH_WORKER_BOOTSTRAP&&message.wasm instanceof ArrayBuffer){bootstrap(message.wasm);return}
  if(runtime)runtime.onMessage(event.data);else pending.push(event.data);
};
