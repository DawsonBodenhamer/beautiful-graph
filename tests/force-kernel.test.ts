import test from "node:test";
import assert from "node:assert/strict";
import { centroidAcceleration, repelFactor } from "../src/center-force.ts";

test("family centroid translation preserves component-local geometry",()=>{
  const family={x:100,y:0},graph={x:0,y:0},left={x:90,y:0},right={x:110,y:0},a=centroidAcceleration(family,graph,.51876,.0025),b=centroidAcceleration(family,graph,.51876,.0025);
  assert.ok(a.x<0);assert.deepEqual(a,b);
  const before=right.x-left.x,after=(right.x+b.x)-(left.x+a.x);
  assert.equal(after,before);
});

test("a remote component receives topology-centroid recovery without a radial envelope",()=>{
  const family={x:100,y:0},left={x:2990,y:-10},right={x:3010,y:10},acceleration=centroidAcceleration({x:3000,y:0},family,1.2,.0012);
  assert.ok(acceleration.x<0);assert.equal(acceleration.y,0);
  const movedLeft={x:left.x+acceleration.x,y:left.y+acceleration.y},movedRight={x:right.x+acceleration.x,y:right.y+acceleration.y};
  assert.equal(Math.hypot(movedRight.x-movedLeft.x,movedRight.y-movedLeft.y),Math.hypot(right.x-left.x,right.y-left.y));
});

test("repel remains an independent pairwise spacing control",()=>{
  const low=repelFactor(100,1,.1,1),high=repelFactor(100,1,.5,1);
  assert.equal(high/low,5);
  assert.equal(repelFactor(100,2,.5,1),high*2);
});

test("far-field repulsion decays smoothly without a hard boundary",()=>{
  const radius=1000,near=repelFactor(radius*radius*.25,1,1,1,radius),atRadius=repelFactor(radius*radius,1,1,1,radius),far=repelFactor(radius*radius*4,1,1,1,radius),justInside=repelFactor(radius*radius*.999,1,1,1,radius),justOutside=repelFactor(radius*radius*1.001,1,1,1,radius);
  assert.ok(near>atRadius&&atRadius>far);assert.ok(Math.abs(justInside-justOutside)/atRadius<.01);assert.ok(far>0);
});
