import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DISPLAY, DEFAULT_FORCES } from "../src/defaults.ts";
import { mappedPositionFromValue, valueFromMappedPosition } from "../src/slider-mapping.ts";

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test("every force default maps to the slider midpoint",()=>{
  for(const [value,min,mid,max] of [
    [DEFAULT_FORCES.center,0,DEFAULT_FORCES.center,12],
    [DEFAULT_FORCES.repel,0,DEFAULT_FORCES.repel,3],
    [DEFAULT_FORCES.link,0,DEFAULT_FORCES.link,.6],
    [DEFAULT_FORCES.distance,10,DEFAULT_FORCES.distance,1500],
    [DEFAULT_FORCES.curvature,-2,DEFAULT_FORCES.curvature,2],
    [DEFAULT_FORCES.stretchiness,-1,DEFAULT_FORCES.stretchiness,1],
    [DEFAULT_FORCES.siblingLinkForce,0,DEFAULT_FORCES.siblingLinkForce,2],
  ])close(mappedPositionFromValue(value,min,mid,max),50);
});

test("every display default maps to the slider midpoint",()=>{for(const [value,min,mid,max] of [
  [DEFAULT_DISPLAY.textFade,2,DEFAULT_DISPLAY.textFade,80],[DEFAULT_DISPLAY.nodeSize,.2,DEFAULT_DISPLAY.nodeSize,8],[DEFAULT_DISPLAY.linkThickness,.1,DEFAULT_DISPLAY.linkThickness,6],[DEFAULT_DISPLAY.glow,0,DEFAULT_DISPLAY.glow,2],[DEFAULT_DISPLAY.glowSize,0,DEFAULT_DISPLAY.glowSize,4],[DEFAULT_DISPLAY.lensOpacity,.04,DEFAULT_DISPLAY.lensOpacity,.8],[DEFAULT_DISPLAY.lensRadius,.5,DEFAULT_DISPLAY.lensRadius,5],
])close(mappedPositionFromValue(value,min,mid,max),50)});

test("signed curvature mapping is invertible",()=>{
  for(const value of [-2,-1,0,.75,2])close(valueFromMappedPosition(mappedPositionFromValue(value,-2,0,2),-2,0,2),value);
});
