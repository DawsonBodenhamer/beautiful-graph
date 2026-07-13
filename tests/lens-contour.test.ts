import assert from "node:assert/strict";
import test from "node:test";
import {buildLensContours} from "../src/lens-contour.ts";

test("nearby lens nodes merge into one rounded component",()=>{const result=buildLensContours([{x:0,y:0,radius:5},{x:24,y:0,radius:5}],{padding:18});assert.equal(result.contours.length,1);assert.ok(result.contours[0]!.length>20)});
test("distant lens groups remain separate bubbles",()=>{const result=buildLensContours([{x:0,y:0,radius:5},{x:160,y:0,radius:5}],{padding:18});assert.equal(result.contours.length,2)});
test("contour grid remains bounded for large layouts",()=>{const result=buildLensContours([{x:-5000,y:-2000,radius:5},{x:5000,y:2000,radius:5}],{padding:20,maxGridCells:120});assert.ok(result.columns<=121);assert.ok(result.rows<=121)});
test("a ring of nodes produces one union contour without a layered hole",()=>{const points=Array.from({length:16},(_,index)=>{const angle=index/16*Math.PI*2;return{x:Math.cos(angle)*38,y:Math.sin(angle)*38,radius:3}});const result=buildLensContours(points,{padding:12,maxGridCells:220,smoothingPasses:4});assert.equal(result.contours.length,1)});
