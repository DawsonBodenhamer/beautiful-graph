import {JavaScriptSimulationEngine} from "./javascript-simulation-engine.ts";
import type {SimulationEngine} from "./simulation-contract.ts";
import {ALPHA_DECAY,ALPHA_INITIAL,ALPHA_MIN,ALPHA_TARGET_REST,AUTOMATIC_WAKE_ALPHA,DRAG_ALPHA_TARGET,WORKER_PROTOCOL_VERSION,WORKER_TICK_INTERVAL_MS,isGraphWorkerRequest,type GraphWorkerRequest,type GraphWorkerResponse} from "./worker-protocol.ts";

export type WorkerRuntimeDependencies={post:(message:GraphWorkerResponse,transfer?:Transferable[])=>void;setTimer:(callback:()=>void,delay:number)=>unknown;clearTimer:(timer:unknown)=>void;createEngine?:()=>SimulationEngine|Promise<SimulationEngine>};

export function createGraphWorkerRuntime(deps:WorkerRuntimeDependencies){
  let engine:SimulationEngine|undefined,revision=0,alpha=ALPHA_INITIAL,alphaTarget=ALPHA_TARGET_REST,timer:unknown,disposed=false,initializing=false,serial=0,pending:GraphWorkerRequest[]=[];
  const publish=(type:"coordinates"|"sleep")=>{if(!engine)return;const state=engine.snapshot(),ids=state.map(node=>node.id),coords=new Float32Array(state.length*2);for(let index=0;index<state.length;index++){const node=state[index]!;coords[index*2]=node.x;coords[index*2+1]=node.y}deps.post({type,version:WORKER_PROTOCOL_VERSION,revision,ids,coords,alpha},[coords.buffer])};
  const cancel=()=>{if(timer!==undefined)deps.clearTimer(timer);timer=undefined};
  const shouldRun=()=>!disposed&&!initializing&&!!engine&&(alpha>=ALPHA_MIN||alphaTarget>=ALPHA_MIN);
  const schedule=()=>{if(timer===undefined&&shouldRun())timer=deps.setTimer(run,WORKER_TICK_INTERVAL_MS)};
  const wake=(requested=AUTOMATIC_WAKE_ALPHA)=>{if(Number.isFinite(requested)&&requested>alpha)alpha=requested;schedule()};
  const finishInit=(selected:SimulationEngine,message:Extract<GraphWorkerRequest,{type:"init"}>,token:number)=>{if(disposed||token!==serial){selected.dispose();return}engine=selected;engine.updateForces(message.forces);engine.reconcile(message.nodes,message.edges);initializing=false;deps.post({type:"ready",version:WORKER_PROTOCOL_VERSION,revision,engine:engine.kind});publish("coordinates");wake(message.heat??ALPHA_INITIAL);const queued=pending;pending=[];for(const item of queued)handle(item)};
  const fail=(error:unknown)=>{initializing=false;deps.post({type:"failure",version:WORKER_PROTOCOL_VERSION,message:error instanceof Error?error.message:"Graph simulation engine initialization failed."})};
  const initialize=(message:Extract<GraphWorkerRequest,{type:"init"}>)=>{cancel();engine?.dispose();engine=undefined;pending=[];revision=message.revision;alpha=ALPHA_INITIAL;alphaTarget=ALPHA_TARGET_REST;initializing=true;const token=++serial;try{const selected=deps.createEngine?.()??new JavaScriptSimulationEngine();if(selected instanceof Promise)void selected.then(value=>finishInit(value,message,token)).catch(fail);else finishInit(selected,message,token)}catch(error){fail(error)}};
  const tick=()=>{if(!engine)return;alpha+=(alphaTarget-alpha)*ALPHA_DECAY;engine.tick(alpha)};
  function run(){timer=undefined;if(!shouldRun())return;timer=deps.setTimer(run,WORKER_TICK_INTERVAL_MS);try{tick();publish("coordinates")}catch(error){cancel();disposed=true;deps.post({type:"failure",version:WORKER_PROTOCOL_VERSION,message:error instanceof Error?error.message:"Graph simulation failed."});return}if(!shouldRun()){cancel();publish("sleep")}}
  const handle=(message:GraphWorkerRequest)=>{
    if(disposed)return;if(message.type==="dispose"){disposed=true;serial++;pending=[];cancel();engine?.dispose();engine=undefined;return}if(message.type==="init"){initialize(message);return}if(initializing){pending.push(message);return}if(!engine)return;
    if(message.type==="topology"){revision=message.revision;engine.reconcile(message.nodes,message.edges);wake(message.heat);return}if(message.type==="forces"){engine.updateForces(message.forces);wake(message.heat);return}if(message.type==="weights"){engine.updateWeights(message.weights);wake(message.heat);return}
    if(message.type==="dragEnd"){engine.setPin(message.id,null,null);alphaTarget=ALPHA_TARGET_REST;wake(AUTOMATIC_WAKE_ALPHA);return}engine.setPin(message.id,message.x,message.y);alphaTarget=DRAG_ALPHA_TARGET;wake(DRAG_ALPHA_TARGET);publish("coordinates");
  };
  return{onMessage:(value:unknown)=>{if(!isGraphWorkerRequest(value)){deps.post({type:"failure",version:WORKER_PROTOCOL_VERSION,message:"Unsupported graph worker protocol message."});return}try{handle(value)}catch(error){cancel();deps.post({type:"failure",version:WORKER_PROTOCOL_VERSION,message:error instanceof Error?error.message:"Graph simulation message failed."})}},dispose:()=>handle({type:"dispose",version:WORKER_PROTOCOL_VERSION}),inspect:()=>({alpha,alphaTarget,scheduled:timer!==undefined,revision,nodeIds:engine?.snapshot().map(node=>node.id)??[],engine:engine?.kind})};
}
