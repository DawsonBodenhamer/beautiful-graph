import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {changedCollisionWeights,graphEventContract,PresentationDirty,PresentationInvalidation,type RetainedGraphEvent} from "../src/presentation-events.ts";
import {interpolateLabelOffset} from "../src/label-layout.ts";
import {RenderIdleWindow,RENDER_IDLE_FRAME_LIMIT} from "../src/renderer-lifecycle.ts";

const worker=(event:RetainedGraphEvent,topologyChanged=false,collisionRadiusChanged=false)=>graphEventContract(event,{topologyChanged,collisionRadiusChanged}).worker;

test("retained event matrix sends worker messages only for physics, topology, and effective collision changes",()=>{
  const matrix:[string,RetainedGraphEvent,boolean,boolean,string|null][]=[
    ["force control","force-control",false,false,"forces"],
    ["Group visibility","active-topology",true,false,"topology"],
    ["category visibility","active-topology",true,false,"topology"],
    ["orphan visibility","active-topology",true,false,"topology"],
    ["Folder Scope","active-topology",true,false,"topology"],
    ["search membership","active-topology",true,false,"topology"],
    ["Analyze & Auto Group visibility","auto-group",true,false,"topology"],
    ["Analyze & Auto Group styling","auto-group",false,false,null],
    ["Group/root collision enlargement","node-presentation",false,true,"weights"],
    ["color, icon, or text","node-presentation",false,false,null],
    ["Node Size under collision floor","node-size",false,false,null],
    ["Node Size collision change","node-size",false,true,"weights"],
    ["Show Sibling Links","link-presentation",false,false,null],
    ["label collision","label-presentation",false,false,null],
    ["Folder Lens","folder-lens",false,false,null],
    ["hover or pinned focus","focus",false,false,null],
    ["focus recentering","camera",false,false,null],
    ["pan or zoom","camera",false,false,null],
    ["panel layout","panel",false,false,null],
  ];
  for(const [name,event,topology,collision,expected] of matrix)assert.equal(worker(event,topology,collision),expected,name);
});

test("presentation dirty flags coalesce and are consumed exactly once",()=>{const dirty=new PresentationInvalidation();dirty.mark(PresentationDirty.Labels);dirty.mark(PresentationDirty.Lens);assert.equal(dirty.take(),PresentationDirty.Labels|PresentationDirty.Lens);assert.equal(dirty.take(),PresentationDirty.None)});

test("collision weights change only when the effective floor or expanded radius changes",()=>{
  const nodes=[{id:"floor",degree:1,radius:1,visible:true},{id:"large",degree:3,radius:10,visible:true}],previous=new Map([["floor",4],["large",10]]);
  const changed=changedCollisionWeights(nodes,1.1,previous);assert.ok(changed);assert.deepEqual(changed.weights,[{id:"floor",degree:1,radius:4},{id:"large",degree:3,radius:11}]);
  assert.equal(changedCollisionWeights([{id:"floor",degree:1,radius:1,visible:true}],2,new Map([["floor",4]])),undefined);
  assert.equal(changedCollisionWeights([{id:"root",degree:1,radius:8,visible:true}],1,new Map([["root",4]]))?.weights[0]?.radius,8);
});

test("presentation systems do not write coordinates or add family and satellite worker fields",()=>{
  const view=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8"),lens=view.slice(view.indexOf("private updateFolderLens"),view.indexOf("private pointInLensContour")),protocol=readFileSync(new URL("../src/worker-protocol.ts",import.meta.url),"utf8");
  assert.doesNotMatch(lens,/\.x\s*=|\.y\s*=|postMessage/);assert.doesNotMatch(protocol,/family|satellite/i);
});

test("label interpolation settles and releases the render idle window",()=>{const idle=new RenderIdleWindow();let current={x:0,y:0,side:-1 as const},target={x:32,y:4,side:1 as const},moving=true,frames=0;while(moving&&frames++<600){const next=interpolateLabelOffset(current,target,40,16),settled=Math.abs(next.x-target.x)<.02&&Math.abs(next.side*40+next.y-(target.side*40+target.y))<.02;current=settled?target:next;moving=!settled;idle.changed()}assert.equal(moving,false);for(let frame=0;frame<=RENDER_IDLE_FRAME_LIMIT;frame++)assert.equal(idle.nextFrame(),true);assert.equal(idle.nextFrame(),false)});

test("lens work is dirty-event bounded and receives an explicit final sleep pass",()=>{const view=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");assert.match(view,/lensGeometryDirty\)\{if\(!this\.zoomAnimating&&now-this\.lastTerritoryUpdate>80\)/);assert.match(view,/message\.type==="sleep"[\s\S]*this\.lensGeometryDirty=true;this\.presentationInvalidation\.mark\(PresentationDirty\.Lens\)/)});

test("retained visual systems remain attached to the isolated renderer",()=>{const view=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");for(const signature of [/getNodeTexture/,/ensureIcon/,/drawLabelBackground/,/applyFocusFrame/,/applySearch/,/updateFolderLens/,/createGroupsPanel/,/createForcesPanel/,/createDisplayPanel/,/\.lineTo\(b\.x,b\.y\)/])assert.match(view,signature)});
