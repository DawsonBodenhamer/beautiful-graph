import type {GraphEdge,GraphForces} from "./types.ts";
import type {WorkerNode} from "./worker-protocol.ts";
import {WASM_ABI_VERSION,effectiveCollisionRadius,toSimulationForces,type SimulationEngine,type SimulationForces,type SimulationNode} from "./simulation-contract.ts";

const NODE_WIDTH=10,LINK_WIDTH=2;
type WasmExports={memory:WebAssembly.Memory;bg_abi_version:()=>number;bg_reserve_nodes:(count:number)=>number;bg_reserve_links:(count:number)=>number;bg_tick:(nodes:number,links:number,alpha:number,center:number,charge:number,link:number,distance:number)=>number;bg_validate_finite:(nodes:number)=>number};
export type WasmSource=URL|ArrayBuffer|Uint8Array|WebAssembly.Module;

export class WasmSimulationEngine implements SimulationEngine{
  readonly kind="wasm" as const;
  private nodes:SimulationNode[]=[];
  private edges:Array<{source:number;target:number}>=[];
  private forces:SimulationForces={center:.1,charge:-1000,link:1,distance:250};
  private readonly wasm:WasmExports;
  constructor(wasm:WasmExports){this.wasm=wasm}

  reconcile(incoming:WorkerNode[],edges:GraphEdge[]):void{const prior=new Map(this.nodes.map(node=>[node.id,node]));this.nodes=incoming.map(node=>{const old=prior.get(node.id),degree=Math.max(1,requiredFinite(node.degree)),radius=effectiveCollisionRadius(requiredFinite(node.radius));if(node.preserve){if(!old)throw new Error(`Cannot preserve missing simulation node ${node.id}.`);old.degree=degree;old.radius=radius;return old}return{id:node.id,x:requiredFinite(node.x),y:requiredFinite(node.y),vx:optionalFinite(node.vx),vy:optionalFinite(node.vy),fx:finiteOrNull(node.fx),fy:finiteOrNull(node.fy),degree,radius}});const indexes=new Map(this.nodes.map((node,index)=>[node.id,index]));this.edges=edges.flatMap(edge=>{const source=indexes.get(edge.source),target=indexes.get(edge.target);return source===undefined||target===undefined||source===target?[]:[{source,target}]})}
  updateForces(forces:GraphForces):void{this.forces=toSimulationForces(forces)}
  updateWeights(weights:Array<{id:string;degree:number;radius:number}>):void{const byId=new Map(this.nodes.map(node=>[node.id,node]));for(const weight of weights){const node=byId.get(weight.id);if(node){node.degree=Math.max(1,requiredFinite(weight.degree));node.radius=effectiveCollisionRadius(requiredFinite(weight.radius))}}}
  setPin(id:string,x:number|null,y:number|null):void{const node=this.nodes.find(candidate=>candidate.id===id);if(!node)return;node.fx=finiteOrNull(x);node.fy=finiteOrNull(y);if(node.fx!==null){node.x=node.fx;node.vx=0}if(node.fy!==null){node.y=node.fy;node.vy=0}}
  snapshot():readonly SimulationNode[]{return this.nodes}
  dispose():void{this.nodes=[];this.edges=[]}

  tick(alpha:number):void{
    const nodePointer=this.wasm.bg_reserve_nodes(this.nodes.length),linkPointer=this.wasm.bg_reserve_links(this.edges.length);
    const values=new Float64Array(this.wasm.memory.buffer,nodePointer,this.nodes.length*NODE_WIDTH),links=new Uint32Array(this.wasm.memory.buffer,linkPointer,this.edges.length*LINK_WIDTH);
    for(let index=0;index<this.nodes.length;index++){const node=this.nodes[index]!,offset=index*NODE_WIDTH;values.set([node.x,node.y,node.vx,node.vy,node.fx??0,node.fy??0,node.degree,node.radius,node.fx===null?0:1,node.fy===null?0:1],offset)}
    for(let index=0;index<this.edges.length;index++){const edge=this.edges[index]!,offset=index*LINK_WIDTH;links[offset]=edge.source;links[offset+1]=edge.target}
    const status=this.wasm.bg_tick(this.nodes.length,this.edges.length,alpha,this.forces.center,this.forces.charge,this.forces.link,this.forces.distance);
    if(status!==0||this.wasm.bg_validate_finite(this.nodes.length)!==0)throw new Error(`Wasm simulation rejected tick with status ${status}.`);
    for(let index=0;index<this.nodes.length;index++){const node=this.nodes[index]!,offset=index*NODE_WIDTH;node.x=values[offset]!;node.y=values[offset+1]!;node.vx=values[offset+2]!;node.vy=values[offset+3]!}
  }
}

export async function createWasmSimulationEngine(source:WasmSource):Promise<WasmSimulationEngine>{
  let input:BufferSource|WebAssembly.Module;
  if(source instanceof URL){const response=await fetch(source);if(!response.ok)throw new Error(`Unable to load graph-sim.wasm (${response.status}).`);input=await response.arrayBuffer()}else input=source;
  const instance=input instanceof WebAssembly.Module?await WebAssembly.instantiate(input,{}):(await WebAssembly.instantiate(input,{})).instance,wasm=instance.exports as unknown as WasmExports;
  if(typeof wasm.bg_abi_version!=="function"||wasm.bg_abi_version()!==WASM_ABI_VERSION||!(wasm.memory instanceof WebAssembly.Memory))throw new Error("Unsupported graph simulation Wasm ABI.");
  return new WasmSimulationEngine(wasm);
}

export async function createPreferredSimulationEngine(wasmUrl:URL):Promise<SimulationEngine>{try{return await createWasmSimulationEngine(wasmUrl)}catch{return new (await import("./javascript-simulation-engine.ts")).JavaScriptSimulationEngine()}}
function requiredFinite(value:unknown):number{if(typeof value!=="number"||!Number.isFinite(value))throw new Error("Simulation node values must be finite.");return value}
function optionalFinite(value:unknown):number{return value===undefined?0:requiredFinite(value)}
function finiteOrNull(value:unknown):number|null{return typeof value==="number"&&Number.isFinite(value)?value:null}
