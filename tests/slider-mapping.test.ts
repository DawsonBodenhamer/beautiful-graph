import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FORCES } from "../src/defaults.ts";
import { mappedPositionFromValue, valueFromMappedPosition } from "../src/slider-mapping.ts";

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test("every force default maps to the slider midpoint",()=>{
  for(const [value,min,mid,max] of [
    [DEFAULT_FORCES.center,0,DEFAULT_FORCES.center,4],
    [DEFAULT_FORCES.repel,0,DEFAULT_FORCES.repel,1],
    [DEFAULT_FORCES.link,0,DEFAULT_FORCES.link,.2],
    [DEFAULT_FORCES.distance,10,DEFAULT_FORCES.distance,500],
    [DEFAULT_FORCES.curvature,-2,DEFAULT_FORCES.curvature,2],
    [DEFAULT_FORCES.stretchiness,-1,DEFAULT_FORCES.stretchiness,1],
  ])close(mappedPositionFromValue(value,min,mid,max),50);
});

test("signed curvature mapping is invertible",()=>{
  for(const value of [-2,-1,0,.75,2])close(valueFromMappedPosition(mappedPositionFromValue(value,-2,0,2),-2,0,2),value);
});
