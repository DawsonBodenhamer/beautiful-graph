import test from "node:test";
import assert from "node:assert/strict";
import { roundedRectRayDistance, tetherEndpoints } from "../src/tether-geometry.ts";

const close=(actual:number,expected:number,epsilon=1e-8)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test("tether overlaps horizontal and vertical opaque boundaries",()=>{
  const horizontal=tetherEndpoints({node:{x:0,y:0},label:{x:100,y:0},nodeRadius:10,pillHalfWidth:20,pillHalfHeight:10,pillRadius:5,overlap:1});
  assert.deepEqual(horizontal,{start:{x:9,y:0},end:{x:81,y:0}});
  const vertical=tetherEndpoints({node:{x:0,y:0},label:{x:0,y:-100},nodeRadius:10,pillHalfWidth:20,pillHalfHeight:10,pillRadius:5,overlap:1});
  assert.deepEqual(vertical,{start:{x:0,y:-9},end:{x:0,y:-91}});
});

test("corner ray intersects the rounded arc, not transparent rectangle space",()=>{
  const direction={x:3,y:1},distance=roundedRectRayDistance(direction,50,20,8),length=Math.hypot(direction.x,direction.y),x=direction.x/length*distance,y=direction.y/length*distance;
  close(Math.hypot(x-(50-8),y-(20-8)),8);
  assert.ok(x<50&&y<20);
});

test("zoomed and displaced tether geometry scales exactly",()=>{
  const base=tetherEndpoints({node:{x:10,y:20},label:{x:96,y:73},nodeRadius:11,pillHalfWidth:30,pillHalfHeight:12,pillRadius:7,overlap:1});
  const zoom=3,scaled=tetherEndpoints({node:{x:30,y:60},label:{x:288,y:219},nodeRadius:33,pillHalfWidth:90,pillHalfHeight:36,pillRadius:21,overlap:3});
  close(scaled.start.x,base.start.x*zoom);close(scaled.start.y,base.start.y*zoom);close(scaled.end.x,base.end.x*zoom);close(scaled.end.y,base.end.y*zoom);
});
