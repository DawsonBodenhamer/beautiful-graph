import test from "node:test";
import assert from "node:assert/strict";
import {interpolateLabelOffset,labelAnchorOffset,labelScreenPosition} from "../src/label-layout.ts";
import {tetherEndpoints} from "../src/tether-geometry.ts";

const close=(actual:number,expected:number,epsilon=1e-8)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test("continuous anchors place labels on every side and diagonally",()=>{
  const node={x:40,y:60},directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:1,y:1}];
  const positions=directions.map(direction=>labelScreenPosition(node,10,30,10,6,labelAnchorOffset(direction,10,30,10,6)));
  assert.ok(positions[0]!.y<node.y&&positions[0]!.x===node.x);assert.ok(positions[1]!.x>node.x&&positions[1]!.y===node.y);assert.ok(positions[2]!.y>node.y);assert.ok(positions[3]!.x<node.x);assert.ok(positions[4]!.x>node.x&&positions[4]!.y>node.y);
});

test("zero direction deterministically falls back above the node",()=>{assert.deepEqual(labelAnchorOffset({x:0,y:0},10,30,10,6),{x:0,y:-32})});

test("tether follows an arbitrary-side label and meets both opaque boundaries",()=>{
  const node={x:40,y:60},offset=labelAnchorOffset({x:1,y:.5},10,30,10,6),label=labelScreenPosition(node,10,30,10,6,offset),tether=tetherEndpoints({node,label,nodeRadius:10,pillHalfWidth:30,pillHalfHeight:10,pillRadius:6});
  close(Math.hypot(tether.start.x-node.x,tether.start.y-node.y),10);assert.ok(tether.end.x<label.x&&tether.end.y<label.y);
});

test("interpolation orbits continuously around the node without snapping through it",()=>{const current=labelAnchorOffset({x:0,y:-1},10,30,10,6),target=labelAnchorOffset({x:1,y:0},10,30,10,6),first=interpolateLabelOffset(current,target,16),second=interpolateLabelOffset(first,target,16),angles=[current,first,second,target].map(point=>Math.atan2(point.y,point.x));assert.ok(angles[0]!<angles[1]!&&angles[1]!<angles[2]!&&angles[2]!<angles[3]!);assert.ok(Math.hypot(first.x,first.y)>0&&Math.hypot(second.x,second.y)>0)});

test("position enforces the current zoom clearance while preserving direction",()=>{const offset=labelAnchorOffset({x:1,y:0},10,30,10,6),zoomed=labelScreenPosition({x:0,y:0},40,30,10,6,offset);assert.deepEqual(zoomed,{x:82,y:0})});
