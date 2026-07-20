import assert from "node:assert/strict";
import test from "node:test";
import { relaxLabelCollisions, type CollisionLabel } from "../src/label-collision.ts";

function overlap(a:CollisionLabel,b:CollisionLabel):number {
  return Math.min((a.w+b.w)/2+4-Math.abs(a.x-b.x),(a.h+b.h)/2+3-Math.abs(a.y-b.y));
}

test("dense pill labels repel without abandoning their tether range",()=>{
  const labels=Array.from({length:10},(_,index)=>({x:300,y:200,homeX:300,homeY:200,w:76,h:24,weight:index<2?.32:.5}));
  const residual=relaxLabelCollisions(labels,{maxOffsetX:260,maxOffsetY:170});
  assert.ok(residual<.5,`residual overlap was ${residual}`);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(overlap(labels[i]!,labels[j]!)<.75);
  assert.ok(labels.every(label=>Math.abs(label.x-label.homeX)<=260&&Math.abs(label.y-label.homeY)<=170));
});

test("labels avoid other labeled nodes while excluding their own node",()=>{
  const labels=[{ownerId:"a",x:100,y:100,homeX:100,homeY:100,w:80,h:24,weight:.5},{ownerId:"b",x:180,y:100,homeX:180,homeY:100,w:80,h:24,weight:.5}],obstacles=[{id:"a",x:100,y:100,radius:24},{id:"b",x:140,y:100,radius:24}];
  const residual=relaxLabelCollisions(labels,{maxOffsetX:200,maxOffsetY:120,obstacles,attractionPasses:0});
  assert.ok(residual<.5,`residual overlap was ${residual}`);
  assert.ok(labels[0]!.x<76,"label a should move away from node b");
  assert.ok(Math.abs(labels[1]!.x-180)<80,"own-node exclusion should not eject label b from its home range");
  assert.ok(overlap(labels[0]!,labels[1]!)<.75,"label cleanup should retain label-label priority");
});
