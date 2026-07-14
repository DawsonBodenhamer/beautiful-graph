import test from "node:test";
import assert from "node:assert/strict";
import { centerAcceleration, repelFactor } from "../src/center-force.ts";

test("center contracts family centroids without changing local spacing inside the envelope",()=>{
  const graph={x:0,y:0},family={x:100,y:0},left={x:90,y:0},right={x:110,y:0},a=centerAcceleration(left,family,graph,1_000,.51876),b=centerAcceleration(right,family,graph,1_000,.51876);
  assert.ok(a.x<0&&b.x<0);
  assert.equal(a.x,b.x);
  const before=right.x-left.x,after=(right.x+b.x)-(left.x+a.x);
  assert.equal(after,before);
});

test("center outer envelope pulls radial outliers inward",()=>{
  const acceleration=centerAcceleration({x:300,y:0},{x:0,y:0},{x:0,y:0},200,.51876);
  assert.ok(acceleration.x<0);
  assert.equal(acceleration.y,0);
});

test("repel remains an independent pairwise spacing control",()=>{
  const low=repelFactor(100,1,.1,1),high=repelFactor(100,1,.5,1);
  assert.equal(high/low,5);
  assert.equal(repelFactor(100,2,.5,1),high*2);
});
