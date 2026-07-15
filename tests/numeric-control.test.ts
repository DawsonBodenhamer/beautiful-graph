import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { clampNumericValue, formatNumericValue, numericDragMultiplier, quantizeNumericValue, textFadeMaximum } from "../src/numeric-control.ts";

const spec={min:-2,max:2,step:.01};
test("numeric values clamp visibly and reject non-finite input",()=>{assert.equal(clampNumericValue(9,spec),2);assert.equal(clampNumericValue(-9,spec),-2);assert.equal(clampNumericValue(Number.NaN,spec),-2);assert.equal(quantizeNumericValue(.126,spec),.13)});
test("scrub modifiers provide precision and coarse movement",()=>{assert.equal(numericDragMultiplier(false,false),1);assert.equal(numericDragMultiplier(true,false),.1);assert.equal(numericDragMultiplier(false,true),10);assert.equal(numericDragMultiplier(true,true),.1)});
test("formatting exposes the shortest lossless decimal",()=>{for(const value of [0,.001,1.147,25000,-2])assert.equal(Number(formatNumericValue(value)),value)});
test("text fade maximum follows visible base radius and node size with hard safety bounds",()=>{assert.equal(textFadeMaximum(1,1),80);assert.equal(textFadeMaximum(30,2),240);assert.equal(textFadeMaximum(1000,16),4096)});
test("control wiring uses only scrub/edit readouts and zero resets",()=>{const source=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");assert.match(source,/readout\.ondblclick/);assert.match(source,/event\.key==="Enter"/);assert.match(source,/event\.key==="Escape"/);assert.match(source,/setPointerCapture/);assert.match(source,/reset\.onclick=.*apply\(0,true\)/);assert.doesNotMatch(source,/beautiful-numeric-range/);assert.doesNotMatch(source,/type:"range"/)});
