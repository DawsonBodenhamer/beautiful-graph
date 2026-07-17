import type { GraphEdge, GraphNode, GraphPoint } from "./types";
import type { WorkerNode } from "./worker-protocol";

export interface NodeReconciliation {
  nodes:GraphNode[];
  added:GraphNode[];
  removedIds:Set<string>;
}

export function reconcileGraphNodes(currentNodes:GraphNode[],freshNodes:GraphNode[]):NodeReconciliation{
  const current=new Map(currentNodes.map(node=>[node.id,node])),freshIds=new Set(freshNodes.map(node=>node.id)),added:GraphNode[]=[];
  const nodes=freshNodes.map(fresh=>{const existing=current.get(fresh.id);if(!existing){added.push(fresh);return fresh}const{x,y,...presentation}=fresh;Object.assign(existing,presentation);return existing});
  return{nodes,added,removedIds:new Set(currentNodes.filter(node=>!freshIds.has(node.id)).map(node=>node.id))};
}

export interface WorkerTopology {
  nodes:WorkerNode[];
  edges:GraphEdge[];
}

export function sameWorkerTopology(currentNodes:GraphNode[],currentEdges:GraphEdge[],nextNodes:GraphNode[],nextEdges:GraphEdge[]):boolean{
  const nodeKeys=(nodes:GraphNode[])=>nodes.filter(node=>node.visible).map(node=>`${node.id}\0${node.radius}`).sort();
  const edgeKeys=(nodes:GraphNode[],edges:GraphEdge[])=>{const ids=new Set(nodes.filter(node=>node.visible).map(node=>node.id));return edges.filter(edge=>ids.has(edge.source)&&ids.has(edge.target)).map(edge=>`${edge.source}\0${edge.target}`).sort()};
  const currentNodeKeys=nodeKeys(currentNodes),nextNodeKeys=nodeKeys(nextNodes),currentEdgeKeys=edgeKeys(currentNodes,currentEdges),nextEdgeKeys=edgeKeys(nextNodes,nextEdges);
  return currentNodeKeys.length===nextNodeKeys.length&&currentNodeKeys.every((key,index)=>key===nextNodeKeys[index])&&currentEdgeKeys.length===nextEdgeKeys.length&&currentEdgeKeys.every((key,index)=>key===nextEdgeKeys[index]);
}

/** Build the complete active topology while preserving worker-owned state for surviving IDs. */
export function prepareWorkerTopology(
  activeNodes:GraphNode[],
  modelEdges:GraphEdge[],
  survivingIds:ReadonlySet<string>,
  storedSeeds:Readonly<Record<string,GraphPoint>>={},
  random:()=>number=Math.random,
  collisionScale=1,
):WorkerTopology {
  const activeIds=new Set(activeNodes.map(node=>node.id));
  const edges=modelEdges.filter(edge=>activeIds.has(edge.source)&&activeIds.has(edge.target));
  const degree=new Map(activeNodes.map(node=>[node.id,0]));
  const neighbors=new Map<string,string[]>();
  for(const edge of edges){
    degree.set(edge.source,(degree.get(edge.source)??0)+1);degree.set(edge.target,(degree.get(edge.target)??0)+1);
    const sourceNeighbors=neighbors.get(edge.source)??[];sourceNeighbors.push(edge.target);neighbors.set(edge.source,sourceNeighbors);
    const targetNeighbors=neighbors.get(edge.target)??[];targetNeighbors.push(edge.source);neighbors.set(edge.target,targetNeighbors);
  }
  const positioned=new Map<string,GraphPoint>();
  for(const node of activeNodes){
    if(survivingIds.has(node.id))positioned.set(node.id,{x:node.x,y:node.y});
    else{const stored=storedSeeds[node.id];if(stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y)){node.x=stored.x;node.y=stored.y;positioned.set(node.id,{x:stored.x,y:stored.y})}}
  }
  const additions=activeNodes.filter(node=>!survivingIds.has(node.id)&&!positioned.has(node.id)).sort((a,b)=>a.path.localeCompare(b.path));
  const addedCount=activeNodes.filter(node=>!survivingIds.has(node.id)).length;
  const jitterWidth=60*Math.sqrt(addedCount);
  let radialExtent=Math.max(0,...[...positioned.values()].map(point=>Math.hypot(point.x,point.y)));
  const outerRadius=Math.sqrt(radialExtent*radialExtent+3600*addedCount);
  for(const node of additions){
    const related=(neighbors.get(node.id)??[]).map(id=>positioned.get(id)).filter((point):point is GraphPoint=>!!point);
    if(related.length){
      node.x=related.reduce((sum,point)=>sum+point.x,0)/related.length+(random()-.5)*jitterWidth;
      node.y=related.reduce((sum,point)=>sum+point.y,0)/related.length+(random()-.5)*jitterWidth;
    }else{
      const angle=random()*Math.PI*2;node.x=Math.cos(angle)*outerRadius;node.y=Math.sin(angle)*outerRadius;
    }
    positioned.set(node.id,{x:node.x,y:node.y});radialExtent=Math.max(radialExtent,Math.hypot(node.x,node.y));
  }
  return{
    edges,
    nodes:activeNodes.map(node=>{const activeDegree=degree.get(node.id)??0;node.degree=activeDegree;const radius=Math.max(4,node.radius*collisionScale);return survivingIds.has(node.id)
      ?{id:node.id,preserve:true,degree:activeDegree,radius}
      :{id:node.id,preserve:false,x:node.x,y:node.y,degree:activeDegree,radius}}),
  };
}
