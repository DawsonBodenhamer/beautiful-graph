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
