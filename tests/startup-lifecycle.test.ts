import assert from "node:assert/strict";
import test from "node:test";
import { admitStartup } from "../src/startup-admission.ts";
import { reconcileGraphNodes } from "../src/graph-reconcile.ts";
import type { GraphNode } from "../src/types.ts";

const node=(id:string,x:number,y:number,label=id)=>({id,path:id,label,folder:"",category:"",color:"#ffffff",icon:"",degree:1,baseRadius:4,radius:4,description:"",visible:true,hub:false,alwaysLabel:false,rootIndexStyled:false,family:"root",x,y}) satisfies GraphNode;

test("restored startup waits for layout readiness and begins exactly once",()=>{let ready:(()=>void)|undefined,begins=0;admitStartup(false,next=>{ready=next},()=>begins++);assert.equal(begins,0);ready!();ready!();assert.equal(begins,1)});
test("manual open begins immediately when layout is ready",()=>{let registered=false,begins=0;admitStartup(true,()=>{registered=true},()=>begins++);assert.equal(registered,false);assert.equal(begins,1)});
test("closing before readiness cancels pending startup work",()=>{let ready:(()=>void)|undefined,begins=0;const cancel=admitStartup(false,next=>{ready=next},()=>begins++);cancel();ready!();assert.equal(begins,0)});
test("topology reconciliation preserves unchanged identity and transient coordinates",()=>{const keep=node("keep.md",10,20,"old"),remove=node("remove.md",30,40),freshKeep=node("keep.md",900,800,"new"),added=node("added.md",50,60),result=reconcileGraphNodes([keep,remove],[freshKeep,added]);assert.equal(result.nodes[0],keep);assert.deepEqual({x:keep.x,y:keep.y,label:keep.label},{x:10,y:20,label:"new"});assert.deepEqual([...result.removedIds],["remove.md"]);assert.deepEqual(result.added,[added])});
