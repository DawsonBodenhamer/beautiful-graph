import type {GraphEdge,GraphForces} from "./types.ts";
import type {WorkerNode} from "./worker-protocol.ts";
import {BARNES_HUT_THETA,COLLISION_STRENGTH,REPULSION_MIN_DISTANCE,effectiveCollisionRadius,toSimulationForces,type SimulationEngine,type SimulationForces,type SimulationNode} from "./simulation-contract.ts";

type Quad={cx:number;cy:number;half:number;mass:number;mx:number;my:number;point:number;children:[number,number,number,number]};
type IndexedEdge={source:number;target:number};
const NODE_EPSILON=1e-6;

export class JavaScriptSimulationEngine implements SimulationEngine{
  readonly kind="javascript" as const;
  private nodes:SimulationNode[]=[];
  private edges:IndexedEdge[]=[];
  private forces:SimulationForces={center:.1,charge:-1000,link:1,distance:250};
  private quads:Quad[]=[];
  private randomState=1;

  reconcile(incoming:WorkerNode[],edges:GraphEdge[]):void{
    const prior=new Map(this.nodes.map(node=>[node.id,node]));
    this.nodes=incoming.map(node=>{
      const old=prior.get(node.id),x=old?.x??requiredFinite(node.x),y=old?.y??requiredFinite(node.y);
      return{id:node.id,x,y,vx:old?.vx??optionalFinite(node.vx),vy:old?.vy??optionalFinite(node.vy),fx:old?.fx??finiteOrNull(node.fx),fy:old?.fy??finiteOrNull(node.fy),degree:Math.max(1,requiredFinite(node.degree)),radius:effectiveCollisionRadius(requiredFinite(node.radius))};
    });
    const indexes=new Map(this.nodes.map((node,index)=>[node.id,index]));
    this.edges=edges.flatMap(edge=>{const source=indexes.get(edge.source),target=indexes.get(edge.target);return source===undefined||target===undefined||source===target?[]:[{source,target}]});
  }

  updateForces(forces:GraphForces):void{this.forces=toSimulationForces(forces)}
  updateWeights(weights:Array<{id:string;degree:number;radius:number}>):void{const byId=new Map(this.nodes.map(node=>[node.id,node]));for(const weight of weights){const node=byId.get(weight.id);if(node){node.degree=Math.max(1,requiredFinite(weight.degree));node.radius=effectiveCollisionRadius(requiredFinite(weight.radius))}}}
  setPin(id:string,x:number|null,y:number|null):void{const node=this.nodes.find(candidate=>candidate.id===id);if(!node)return;node.fx=finiteOrNull(x);node.fy=finiteOrNull(y);if(node.fx!==null){node.x=node.fx;node.vx=0}if(node.fy!==null){node.y=node.fy;node.vy=0}}
  snapshot():readonly SimulationNode[]{return this.nodes}
  dispose():void{this.nodes=[];this.edges=[];this.quads=[]}

  tick(alpha:number):void{
    if(!Number.isFinite(alpha))throw new Error("Simulation alpha must be finite.");
    this.link(alpha);
    this.center(alpha);
    this.charge(alpha);
    this.collide();
    for(const node of this.nodes){
      if(node.fx===null){node.vx*=.6;node.x+=node.vx}else{node.x=node.fx;node.vx=0}
      if(node.fy===null){node.vy*=.6;node.y+=node.vy}else{node.y=node.fy;node.vy=0}
      if(!finiteNode(node)){node.x=0;node.y=0;node.vx=0;node.vy=0}
    }
  }

  private link(alpha:number):void{
    for(const edge of this.edges){const source=this.nodes[edge.source]!,target=this.nodes[edge.target]!;let dx=target.x+target.vx-source.x-source.vx,dy=target.y+target.vy-source.y-source.vy;if(dx===0)dx=this.jiggle();if(dy===0)dy=this.jiggle();const length=Math.hypot(dx,dy),factor=(length-this.forces.distance)/length*alpha*this.forces.link/Math.max(1,Math.min(source.degree,target.degree)),bias=source.degree/(source.degree+target.degree);dx*=factor;dy*=factor;target.vx-=dx*bias;target.vy-=dy*bias;source.vx+=dx*(1-bias);source.vy+=dy*(1-bias)}
  }
  private center(alpha:number):void{for(const node of this.nodes){node.vx-=node.x*this.forces.center*alpha;node.vy-=node.y*this.forces.center*alpha}}

  private charge(alpha:number):void{
    this.buildQuadtree();const theta2=BARNES_HUT_THETA*BARNES_HUT_THETA,min2=REPULSION_MIN_DISTANCE*REPULSION_MIN_DISTANCE;
    for(let index=0;index<this.nodes.length;index++){const node=this.nodes[index]!,stack=this.quads.length?[0]:[];while(stack.length){const quad=this.quads[stack.pop()!]!;if(quad.mass===0)continue;let dx=quad.mx/quad.mass-node.x,dy=quad.my/quad.mass-node.y;if(dx===0)dx=this.jiggle();if(dy===0)dy=this.jiggle();let distance2=dx*dx+dy*dy;const internal=quad.children[0]>=0;if(internal&&(quad.half*2)*(quad.half*2)>=theta2*distance2){for(const child of quad.children)if(child>=0)stack.push(child);continue}const mass=internal?quad.mass:quad.point===index?quad.mass-1:quad.mass;if(mass<=0)continue;if(distance2<min2)distance2=Math.sqrt(min2*distance2);const scale=this.forces.charge*mass*alpha/distance2;node.vx+=dx*scale;node.vy+=dy*scale}}
  }

  private collide():void{
    for(let left=0;left<this.nodes.length;left++)for(let right=left+1;right<this.nodes.length;right++){const a=this.nodes[left]!,b=this.nodes[right]!,radius=a.radius+b.radius;let dx=a.x+a.vx-b.x-b.vx,dy=a.y+a.vy-b.y-b.vy;if(dx===0)dx=this.jiggle();if(dy===0)dy=this.jiggle();const distance2=dx*dx+dy*dy;if(distance2>=radius*radius)continue;const distance=Math.sqrt(distance2),factor=(radius-distance)/distance*COLLISION_STRENGTH,share=b.radius*b.radius/(a.radius*a.radius+b.radius*b.radius);dx*=factor;dy*=factor;a.vx+=dx*share;a.vy+=dy*share;b.vx-=dx*(1-share);b.vy-=dy*(1-share)}
  }

  private buildQuadtree():void{
    this.quads.length=0;if(!this.nodes.length)return;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const node of this.nodes){minX=Math.min(minX,node.x);minY=Math.min(minY,node.y);maxX=Math.max(maxX,node.x);maxY=Math.max(maxY,node.y)}const size=Math.max(1,maxX-minX,maxY-minY),half=size/2+NODE_EPSILON;this.quads.push(makeQuad((minX+maxX)/2,(minY+maxY)/2,half));for(let point=0;point<this.nodes.length;point++)this.insert(0,point,0);this.accumulate(0);
  }
  private insert(quadIndex:number,point:number,depth:number):void{
    const quad=this.quads[quadIndex]!,node=this.nodes[point]!;
    if(quad.point<0&&quad.children[0]<0){quad.point=point;return}
    if(depth>=40){return}
    if(quad.children[0]<0){const existing=quad.point;quad.point=-1;this.split(quadIndex);if(existing>=0)this.insert(this.childFor(quadIndex,this.nodes[existing]!.x,this.nodes[existing]!.y),existing,depth+1)}
    this.insert(this.childFor(quadIndex,node.x,node.y),point,depth+1);
  }
  private split(index:number):void{const quad=this.quads[index]!,half=quad.half/2;for(let child=0;child<4;child++){const x=quad.cx+(child&1?half:-half),y=quad.cy+(child&2?half:-half);quad.children[child]=this.quads.length;this.quads.push(makeQuad(x,y,half))}}
  private childFor(index:number,x:number,y:number):number{const quad=this.quads[index]!,slot=(x>=quad.cx?1:0)|(y>=quad.cy?2:0);return quad.children[slot]!}
  private accumulate(index:number):void{const quad=this.quads[index]!;if(quad.children[0]<0){if(quad.point>=0){const node=this.nodes[quad.point]!;quad.mass=1;quad.mx=node.x;quad.my=node.y}return}for(const childIndex of quad.children){this.accumulate(childIndex);const child=this.quads[childIndex]!;quad.mass+=child.mass;quad.mx+=child.mx;quad.my+=child.my}}
  private jiggle():number{this.randomState=(Math.imul(1664525,this.randomState)+1013904223)>>>0;return(this.randomState/4294967296-.5)*NODE_EPSILON}
}

function makeQuad(cx:number,cy:number,half:number):Quad{return{cx,cy,half,mass:0,mx:0,my:0,point:-1,children:[-1,-1,-1,-1]}}
function requiredFinite(value:unknown):number{if(typeof value!=="number"||!Number.isFinite(value))throw new Error("Simulation node values must be finite.");return value}
function optionalFinite(value:unknown):number{return value===undefined?0:requiredFinite(value)}
function finiteOrNull(value:unknown):number|null{return typeof value==="number"&&Number.isFinite(value)?value:null}
function finiteNode(node:SimulationNode):boolean{return Number.isFinite(node.x)&&Number.isFinite(node.y)&&Number.isFinite(node.vx)&&Number.isFinite(node.vy)}
