import type { GraphEdge, GraphRelationship } from "./types";

export interface DirectedLinkEvidence { source:string; target:string }

export interface GraphRelationships {
  edges:GraphEdge[];
  parentsByNode:Map<string,Set<string>>;
  familyByNode:Map<string,string>;
}

export function isIndexPath(path:string):boolean {
  return path === "index.md" || path.endsWith("/index.md");
}

export function folderOf(path:string):string {
  const index=path.lastIndexOf("/");
  return index<0?"":path.slice(0,index);
}

function isFolderAncestor(ancestor:string,descendant:string):boolean {
  return ancestor===""?descendant!=="":descendant.startsWith(`${ancestor}/`);
}

function commonFolderDepth(left:string,right:string):number {
  const a=left.split("/").filter(Boolean),b=right.split("/").filter(Boolean);
  let depth=0;
  while(depth<a.length&&depth<b.length&&a[depth]===b[depth])depth++;
  return depth;
}

function chooseParent(path:string,parents:Iterable<string>):string|undefined {
  const folder=folderOf(path),choices=[...parents];
  choices.sort((left,right)=>{
    const lf=folderOf(left),rf=folderOf(right),la=lf===folder||isFolderAncestor(lf,folder),ra=rf===folder||isFolderAncestor(rf,folder);
    if(la!==ra)return la?-1:1;
    if(la&&ra){const depth=rf.split("/").filter(Boolean).length-lf.split("/").filter(Boolean).length;if(depth)return depth}
    const shared=commonFolderDepth(folder,rf)-commonFolderDepth(folder,lf);
    return shared||left.localeCompare(right);
  });
  return choices[0];
}

function intersects(left:Set<string>|undefined,right:Set<string>|undefined):boolean {
  if(!left||!right)return false;
  for(const value of left)if(right.has(value))return true;
  return false;
}

export function deriveGraphRelationships(paths:Iterable<string>,directedLinks:Iterable<DirectedLinkEvidence>):GraphRelationships {
  const known=new Set(paths),pairs=new Map<string,{source:string;target:string;forward:boolean;reverse:boolean}>();
  for(const link of directedLinks){
    if(link.source===link.target||!known.has(link.source)||!known.has(link.target))continue;
    const forward=link.source<link.target,source=forward?link.source:link.target,target=forward?link.target:link.source,key=`${source}\0${target}`;
    const pair=pairs.get(key)??{source,target,forward:false,reverse:false};
    if(forward)pair.forward=true;else pair.reverse=true;
    pairs.set(key,pair);
  }

  const parentsByNode=new Map<string,Set<string>>(),addParent=(child:string,parent:string)=>{
    const parents=parentsByNode.get(child)??new Set<string>();parents.add(parent);parentsByNode.set(child,parents);
  };

  for(const pair of pairs.values()){
    const aIndex=isIndexPath(pair.source),bIndex=isIndexPath(pair.target),aToB=pair.forward,bToA=pair.reverse;
    if(aIndex&&bIndex&&aToB&&bToA){
      const af=folderOf(pair.source),bf=folderOf(pair.target);
      if(isFolderAncestor(af,bf))addParent(pair.target,pair.source);
      else if(isFolderAncestor(bf,af))addParent(pair.source,pair.target);
    }else{
      if(aIndex&&aToB)addParent(pair.target,pair.source);
      if(bIndex&&bToA)addParent(pair.source,pair.target);
    }
  }

  const edges:GraphEdge[]=[];
  for(const pair of pairs.values()){
    const aIndex=isIndexPath(pair.source),bIndex=isIndexPath(pair.target),mutual=pair.forward&&pair.reverse;
    let relationship:GraphRelationship="cross";
    if(aIndex&&bIndex){
      if(mutual){const af=folderOf(pair.source),bf=folderOf(pair.target);relationship=isFolderAncestor(af,bf)||isFolderAncestor(bf,af)?"parent":"sibling"}
      else relationship="parent";
    }else if(aIndex||bIndex){
      const indexPoints=aIndex?pair.forward:pair.reverse;
      relationship=indexPoints?"parent":"cross";
    }else if(intersects(parentsByNode.get(pair.source),parentsByNode.get(pair.target)))relationship="sibling";
    edges.push({...pair,relationship});
  }
  edges.sort((left,right)=>left.source.localeCompare(right.source)||left.target.localeCompare(right.target));

  const familyByNode=new Map<string,string>();
  for(const path of known){const parent=chooseParent(path,parentsByNode.get(path)??[]);familyByNode.set(path,parent??`folder:${folderOf(path)}`)}
  return{edges,parentsByNode,familyByNode};
}
