import test from "node:test";
import assert from "node:assert/strict";
import { activeNodeIds, applyDerivedNodePresentation, sameNodeIds } from "../src/node-presentation.ts";
import type { GraphEdge, GraphNode } from "../src/types.ts";

const node=(path:string,baseRadius:number):GraphNode=>({
  id:path,path,label:path,folder:path.includes("/")?path.slice(0,path.lastIndexOf("/")):"",category:"Wiki",
  color:"#000000",icon:"",degree:1,baseRadius,radius:baseRadius,description:"",visible:true,hub:false,
  alwaysLabel:false,rootIndexStyled:false,family:`folder:${path.includes("/")?path.slice(0,path.lastIndexOf("/")):""}`,x:0,y:0,
});
const edges:GraphEdge[]=[{source:"index.md",target:"wiki/a.md",forward:true,reverse:false,relationship:"parent"}];
const settings={
  groups:[{id:"wiki",root:"wiki",color:"#123456",icon:"📜",visible:true,origin:"auto" as const,order:0}],
  other:{visible:true,color:"#222222",icon:"📂",colorMode:"custom" as const},
  rootIndex:{enabled:true,color:"#ffbb00",icon:"🌱",includeLinked:false},
};

test("derived hierarchy is global and idempotent",()=>{
  const nodes=[node("index.md",4),node("wiki/index.md",6),node("wiki/a.md",20),node("raw/a.md",8)];
  applyDerivedNodePresentation(nodes,edges,settings);
  assert.equal(nodes[0]!.radius,20);
  assert.equal(nodes[1]!.radius,20);
  assert.equal(nodes[2]!.radius,20);
  assert.equal(nodes[0]!.alwaysLabel,true);
  assert.equal(nodes[1]!.alwaysLabel,true);
  nodes[0]!.radius=999;nodes[1]!.radius=999;
  applyDerivedNodePresentation(nodes,edges,settings);
  assert.equal(nodes[0]!.radius,20);
  assert.equal(nodes[1]!.radius,20);
  assert.equal(nodes[2]!.baseRadius,20);
});

test("root styling only includes direct links when enabled",()=>{
  const nodes=[node("index.md",4),node("wiki/a.md",5)];
  applyDerivedNodePresentation(nodes,edges,settings);
  assert.equal(nodes[0]!.rootIndexStyled,true);
  assert.equal(nodes[1]!.rootIndexStyled,false);
  applyDerivedNodePresentation(nodes,edges,{...settings,rootIndex:{...settings.rootIndex,includeLinked:true}});
  assert.equal(nodes[1]!.rootIndexStyled,true);
});

test("active node set comparison ignores order and detects membership changes",()=>{
  const a=node("a.md",4),b=node("b.md",4),hidden=node("c.md",4);hidden.visible=false;
  assert.equal(sameNodeIds(activeNodeIds([a,b,hidden]),new Set(["b.md","a.md"])),true);
  assert.equal(sameNodeIds(activeNodeIds([a,b]),new Set(["a.md"])),false);
});
