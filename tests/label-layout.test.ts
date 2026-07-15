import test from "node:test";
import assert from "node:assert/strict";
import { labelScreenPosition } from "../src/label-layout.ts";
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
