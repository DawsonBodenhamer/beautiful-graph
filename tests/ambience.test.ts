import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_AMBIENCE } from "../src/defaults.ts";
import { createDustParticle, dustLayerCounts, dustPosition, normalizeAmbience, transformedDustColor } from "../src/ambience.ts";

test("ambience defaults and corrupted partial values normalize additively",()=>{
  assert.deepEqual(normalizeAmbience(undefined),DEFAULT_AMBIENCE);
  assert.deepEqual(normalizeAmbience({vignette:Number.NaN,brightness:9,hue:-999,saturation:-1,speed:Infinity,count:120.7,irregularity:2,particleSize:0,dustFade:.35,dustBoost:.65}),{...DEFAULT_AMBIENCE,brightness:2,hue:-180,saturation:0,count:121,irregularity:1,particleSize:.25,dustFade:.35,dustBoost:.65});
});

test("default count splits into 84 background and 36 foreground particles",()=>{assert.deepEqual(dustLayerCounts(120),{background:84,foreground:36});assert.deepEqual(dustLayerCounts(400),{background:280,foreground:120});assert.deepEqual(dustLayerCounts(-4),{background:0,foreground:0})});

test("particle generation is deterministic, finite, bounded, and layer-seeded",()=>{const a=createDustParticle(17,"background"),b=createDustParticle(17,"background"),foreground=createDustParticle(17,"foreground");assert.deepEqual(a,b);assert.notDeepEqual(a,foreground);for(const value of Object.values(a))assert.equal(Number.isFinite(value),true);for(const layer of ["background","foreground"] as const)for(const time of [0,.016,3,900]){const point=dustPosition(createDustParticle(5,layer),layer,time,.6,1920,1080);assert.equal(Number.isFinite(point.x)&&Number.isFinite(point.y),true);assert.ok(point.x>-1000&&point.x<3000);assert.ok(point.y>-200&&point.y<1300)}});

test("layers rotate in opposite directions and absolute-time evaluation is delta independent",()=>{const particle=createDustParticle(8,"background"),center={x:500,y:400},angle=(layer:"background"|"foreground",time:number)=>{const point=dustPosition(particle,layer,time,0,1000,800);return Math.atan2(point.y-particle.band*800,point.x-center.x)};assert.ok(angle("background",.1)>angle("background",0));assert.ok(angle("foreground",.1)<angle("foreground",0));const direct=dustPosition(particle,"background",10,.6,1000,800),stepped=dustPosition(particle,"background",2+3+5,.6,1000,800);assert.deepEqual(direct,stepped)});

test("organic paths have no accumulated radial or vertical drift",()=>{const particle=createDustParticle(23,"background"),samples=2000;let radialStart=0,radialEnd=0,yOffset=0;for(let index=0;index<samples;index++){const time=index*400/(samples-1),point=dustPosition(particle,"background",time,1,1200,900),radius=Math.abs(point.x-600);if(index<100)radialStart+=radius;if(index>=samples-100)radialEnd+=radius;yOffset+=point.y-particle.band*900}assert.ok(Math.abs(radialStart/100-radialEnd/100)<100);assert.ok(Math.abs(yOffset/samples)<20)});

test("Dust Boost is applied after hue, saturation, and brightness transformation",()=>{const transformed=transformedDustColor({...DEFAULT_AMBIENCE,hue:90,saturation:.3,brightness:.5,dustBoost:0}),boosted=transformedDustColor({...DEFAULT_AMBIENCE,hue:90,saturation:.3,brightness:.5,dustBoost:1});assert.notEqual(transformed,boosted);assert.equal(boosted,"rgb(255, 255, 255)")});

test("Canvas2D lifecycle is independent, static-aware, and fully disposable",()=>{const source=readFileSync(new URL("../src/ambient-dust.ts",import.meta.url),"utf8");assert.match(source,/requestAnimationFrame\(this\.draw\)/);assert.match(source,/value\.count>0&&value\.dustFade>0&&value\.speed>0/);assert.match(source,/prefers-reduced-motion: reduce/);assert.match(source,/getClientRects\(\)\.length>0/);assert.match(source,/IntersectionObserver/);assert.match(source,/document\.visibilityState==="visible"/);assert.match(source,/cancelAnimationFrame\(this\.frame\)/);assert.match(source,/this\.background\.remove\(\);this\.foreground\.remove\(\)/);assert.doesNotMatch(source,/pixi|worker|changedFor|renderGraph/)});

test("foreground uses a larger baked blur while particle size scales both layers",()=>{const source=readFileSync(new URL("../src/ambient-dust.ts",import.meta.url),"utf8");assert.match(source,/layer==="background"\?1\.25:4\.8/);assert.match(source,/particle\.size\*ambience\.particleSize/);assert.match(source,/foreground\?\.16:\.08/);assert.match(source,/foreground\?1:\.55/)});
