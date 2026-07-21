import test from "node:test";
import assert from "node:assert/strict";
import { interpolateLabelOffset, labelScreenPosition } from "../src/label-layout.ts";
import { tetherEndpoints } from "../src/tether-geometry.ts";

test("cached label side follows the moving node every frame",()=>{
  const above=labelScreenPosition({x:40,y:60},10,20,{x:3,y:2,side:-1});
  const below=labelScreenPosition({x:40,y:60},10,20,{x:3,y:2,side:1});
  assert.deepEqual(above,{x:43,y:27});assert.deepEqual(below,{x:43,y:97});
});

test("tether direction follows the actual cached-side label position",()=>{
  const node={x:40,y:60},label=labelScreenPosition(node,10,20,{x:0,y:0,side:1}),tether=tetherEndpoints({node,label,nodeRadius:10,pillHalfWidth:30,pillHalfHeight:10,pillRadius:6,overlap:1});
  assert.ok(tether.start.y>node.y);assert.ok(tether.end.y<label.y);
});
test("zoom-frame interpolation remains continuous when a pill changes sides",()=>{const baseline=40,current={x:0,y:0,side:-1 as const},target={x:20,y:0,side:1 as const},first=interpolateLabelOffset(current,target,baseline,16),second=interpolateLabelOffset(first,target,baseline,16),startY=current.side*baseline+current.y,firstY=first.side*baseline+first.y,secondY=second.side*baseline+second.y;assert.ok(first.x>0&&first.x<target.x);assert.ok(startY<firstY&&firstY<secondY);assert.ok(secondY<baseline)});
test("a deferred collision target eases from the natural label position without snapping",()=>{const baseline=36,start={x:0,y:0,side:-1 as const},target={x:84,y:18,side:1 as const},first=interpolateLabelOffset(start,target,baseline,16);assert.notDeepEqual(first,target);assert.ok(first.x>start.x&&first.x<target.x);const startY=start.side*baseline+start.y,targetY=target.side*baseline+target.y,firstY=first.side*baseline+first.y;assert.ok(firstY>startY&&firstY<targetY)});
