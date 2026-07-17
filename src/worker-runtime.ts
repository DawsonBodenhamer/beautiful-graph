import type {GraphEdge,GraphForces} from "./types.ts";
import {ALPHA_DECAY,ALPHA_INITIAL,ALPHA_MIN,ALPHA_TARGET_REST,AUTOMATIC_WAKE_ALPHA,DRAG_ALPHA_TARGET,VELOCITY_RETENTION,WORKER_PROTOCOL_VERSION,WORKER_TICK_INTERVAL_MS,isGraphWorkerRequest,type GraphWorkerRequest,type GraphWorkerResponse,type WorkerNode} from "./worker-protocol.ts";

type RuntimeNode=Required<WorkerNode>&{fx:number|null;fy:number|null;lastX:number;lastY:number};
export type WorkerRuntimeDependencies={
  post:(message:GraphWorkerResponse,transfer?:Transferable[])=>void;
  setTimer:(callback:()=>void,delay:number)=>unknown;
  clearTimer:(timer:unknown)=>void;
};

export function createGraphWorkerRuntime(deps:WorkerRuntimeDependencies){
  let nodes:RuntimeNode[]=[],edges:GraphEdge[]=[],forces:GraphForces|undefined,revision=0,alpha=ALPHA_INITIAL,alphaTarget=ALPHA_TARGET_REST,timer:unknown,disposed=false;
  const byId=()=>new Map(nodes.map(node=>[node.id,node]));
  const publish=(type:"coordinates"|"sleep")=>{const ids=nodes.map(node=>node.id),coords=new Float32Array(nodes.length*2);for(let index=0;index<nodes.length;index++){const node=nodes[index]!,x=Number.isFinite(node.x)?node.x:node.lastX,y=Number.isFinite(node.y)?node.y:node.lastY;coords[index*2]=x;coords[index*2+1]=y}deps.post({type,version:WORKER_PROTOCOL_VERSION,revision,ids,coords,alpha},[coords.buffer])};
  const cancel=()=>{if(timer!==undefined)deps.clearTimer(timer);timer=undefined};
  const shouldRun=()=>!disposed&&(alpha>=ALPHA_MIN||alphaTarget>=ALPHA_MIN);
  const schedule=()=>{if(timer===undefined&&shouldRun())timer=deps.setTimer(run,WORKER_TICK_INTERVAL_MS)};
  const wake=(requested=AUTOMATIC_WAKE_ALPHA)=>{if(Number.isFinite(requested)&&requested>alpha)alpha=requested;schedule()};
  const reconcile=(incoming:WorkerNode[])=>{const prior=byId();nodes=incoming.map(node=>{const existing=prior.get(node.id),x=existing?.x??(Number.isFinite(node.x)?node.x:0),y=existing?.y??(Number.isFinite(node.y)?node.y:0);return{id:node.id,x,y,degree:node.degree,radius:node.radius,vx:existing?.vx??node.vx??0,vy:existing?.vy??node.vy??0,fx:existing?.fx??null,fy:existing?.fy??null,lastX:existing?.lastX??x,lastY:existing?.lastY??y}})};
  const tick=()=>{
    alpha+=(alphaTarget-alpha)*ALPHA_DECAY;
    const map=byId();
    if(forces){
      for(const edge of edges){const source=map.get(edge.source),target=map.get(edge.target);if(!source||!target)continue;const dx=target.x-source.x,dy=target.y-source.y,distance=Math.hypot(dx,dy)||1,desired=Math.max(1,forces.distance),degree=Math.max(1,Math.min(source.degree,target.degree)),strength=Math.max(0,forces.link)/degree,error=(distance-desired)*strength*alpha,nx=dx/distance,ny=dy/distance;source.vx+=nx*error;source.vy+=ny*error;target.vx-=nx*error;target.vy-=ny*error}
      let cx=0,cy=0;for(const node of nodes){cx+=node.x;cy+=node.y}cx/=Math.max(1,nodes.length);cy/=Math.max(1,nodes.length);for(const node of nodes){if(node.fx!==null&&node.fy!==null){node.x=node.fx;node.y=node.fy;node.vx=0;node.vy=0;node.lastX=node.x;node.lastY=node.y;continue}node.vx=(node.vx+(cx-node.x)*forces.center*.001*alpha)*VELOCITY_RETENTION;node.vy=(node.vy+(cy-node.y)*forces.center*.001*alpha)*VELOCITY_RETENTION;const x=node.x+node.vx,y=node.y+node.vy;if(Number.isFinite(x)&&Number.isFinite(y)){node.x=x;node.y=y;node.lastX=x;node.lastY=y}else{node.x=node.lastX;node.y=node.lastY;node.vx=0;node.vy=0}}
    }
  };
  function run(){timer=undefined;if(!shouldRun())return;timer=deps.setTimer(run,WORKER_TICK_INTERVAL_MS);tick();publish("coordinates");if(!shouldRun()){cancel();publish("sleep")}}
  const handle=(message:GraphWorkerRequest)=>{
    if(disposed)return;
    if(message.type==="dispose"){disposed=true;cancel();return}
    if(message.type==="init"){cancel();revision=message.revision;edges=message.edges;forces=message.forces;reconcile(message.nodes);alpha=ALPHA_INITIAL;alphaTarget=ALPHA_TARGET_REST;deps.post({type:"ready",version:WORKER_PROTOCOL_VERSION,revision});publish("coordinates");wake(message.heat??ALPHA_INITIAL);return}
    if(message.type==="topology"){revision=message.revision;edges=message.edges;reconcile(message.nodes);wake(message.heat);return}
    if(message.type==="forces"){forces=message.forces;wake(message.heat);return}
    if(message.type==="weights"){const map=byId();for(const weight of message.weights){const node=map.get(weight.id);if(node){node.degree=weight.degree;node.radius=weight.radius}}wake(message.heat);return}
    const node=byId().get(message.id);if(!node)return;
    if(message.type==="dragEnd"){node.fx=null;node.fy=null;alphaTarget=ALPHA_TARGET_REST;wake(AUTOMATIC_WAKE_ALPHA);return}
    if(Number.isFinite(message.x)&&Number.isFinite(message.y)){node.fx=message.x;node.fy=message.y;node.x=message.x;node.y=message.y;node.lastX=node.x;node.lastY=node.y;node.vx=0;node.vy=0;alphaTarget=DRAG_ALPHA_TARGET;wake(DRAG_ALPHA_TARGET);publish("coordinates")}
  };
  return{onMessage:(value:unknown)=>{if(!isGraphWorkerRequest(value)){deps.post({type:"failure",version:WORKER_PROTOCOL_VERSION,message:"Unsupported graph worker protocol message."});return}handle(value)},dispose:()=>handle({type:"dispose",version:WORKER_PROTOCOL_VERSION}),inspect:()=>({alpha,alphaTarget,scheduled:timer!==undefined,revision,nodeIds:nodes.map(node=>node.id)})};
}
