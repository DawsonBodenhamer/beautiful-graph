import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_AMBIENCE } from "../src/defaults.ts";
import { createDustParticle, dustLayerCounts, dustPosition, normalizeAmbience, transformedDustColor } from "../src/ambience.ts";
import { BLUE_NOISE_SIZE, backdropColorAt, createBlueNoiseThresholds, quantizeBackdropColor } from "../src/backdrop.ts";

test("ambience defaults and corrupted partial values normalize additively",()=>{
  assert.deepEqual(normalizeAmbience(undefined),DEFAULT_AMBIENCE);
  assert.deepEqual(normalizeAmbience({vignette:Number.NaN,brightness:9,hue:-999,saturation:9,speed:Infinity,count:900,irregularity:4,particleSize:8,dustFade:.35,dustBoost:.65}),{...DEFAULT_AMBIENCE,brightness:2,hue:-180,saturation:5,count:800,irregularity:3,particleSize:5,dustFade:.35,dustBoost:.65});
});

test("default count splits into 84 background and 36 foreground particles",()=>{assert.deepEqual(dustLayerCounts(120),{background:84,foreground:36});assert.deepEqual(dustLayerCounts(800),{background:560,foreground:240});assert.deepEqual(dustLayerCounts(-4),{background:0,foreground:0})});

test("particle generation is deterministic, finite, bounded, and layer-seeded",()=>{const a=createDustParticle(17,"background"),b=createDustParticle(17,"background"),foreground=createDustParticle(17,"foreground");assert.deepEqual(a,b);assert.notDeepEqual(a,foreground);for(const value of Object.values(a))assert.equal(Number.isFinite(value),true);for(const layer of ["background","foreground"] as const)for(const time of [0,.016,3,900]){const point=dustPosition(createDustParticle(5,layer),layer,time,.6,1920,1080);assert.equal(Number.isFinite(point.x)&&Number.isFinite(point.y),true);assert.ok(point.x>-1000&&point.x<3000);assert.ok(point.y>-200&&point.y<1300)}});

test("layers rotate in opposite directions and absolute-time evaluation is delta independent",()=>{const particle=createDustParticle(8,"background"),center={x:500,y:400},angle=(layer:"background"|"foreground",time:number)=>{const point=dustPosition(particle,layer,time,0,1000,800);return Math.atan2(point.y-particle.band*800,point.x-center.x)};assert.ok(angle("background",.1)>angle("background",0));assert.ok(angle("foreground",.1)<angle("foreground",0));const direct=dustPosition(particle,"background",10,.6,1000,800),stepped=dustPosition(particle,"background",2+3+5,.6,1000,800);assert.deepEqual(direct,stepped)});

test("organic paths have no accumulated radial or vertical drift",()=>{const particle=createDustParticle(23,"background"),samples=2000;let radialStart=0,radialEnd=0,yOffset=0;for(let index=0;index<samples;index++){const time=index*400/(samples-1),point=dustPosition(particle,"background",time,1,1200,900),radius=Math.abs(point.x-600);if(index<100)radialStart+=radius;if(index>=samples-100)radialEnd+=radius;yOffset+=point.y-particle.band*900}assert.ok(Math.abs(radialStart/100-radialEnd/100)<100);assert.ok(Math.abs(yOffset/samples)<20)});

test("Dust Boost is applied after hue, saturation, and brightness transformation",()=>{const transformed=transformedDustColor({...DEFAULT_AMBIENCE,hue:90,saturation:.3,brightness:.5,dustBoost:0}),boosted=transformedDustColor({...DEFAULT_AMBIENCE,hue:90,saturation:.3,brightness:.5,dustBoost:1});assert.notEqual(transformed,boosted);assert.equal(boosted,"rgb(255, 255, 255)")});

test("Canvas2D lifecycle is independent, static-aware, and fully disposable",()=>{const source=readFileSync(new URL("../src/ambient-dust.ts",import.meta.url),"utf8");assert.match(source,/requestAnimationFrame\(this\.draw\)/);assert.match(source,/value\.count>0&&value\.dustFade>0&&value\.speed>0/);assert.match(source,/prefers-reduced-motion: reduce/);assert.match(source,/getClientRects\(\)\.length>0/);assert.match(source,/IntersectionObserver/);assert.match(source,/document\.visibilityState==="visible"/);assert.match(source,/renderDitheredBackdrop/);assert.match(source,/if\(this\.backdropDirty\)/);assert.match(source,/cancelAnimationFrame\(this\.frame\)/);assert.match(source,/this\.background\.remove\(\);this\.foreground\.remove\(\)/);assert.doesNotMatch(source,/pixi|worker|changedFor|renderGraph/)});

test("foreground particles are 20 percent larger with a reduced baked blur",()=>{const source=readFileSync(new URL("../src/ambient-dust.ts",import.meta.url),"utf8");assert.match(source,/MAX_PARTICLES=800/);assert.match(source,/layer==="background"\?1\.25:1\.5/);assert.match(source,/particle\.size\*ambience\.particleSize/);assert.match(source,/foreground\?\.16:\.08/);assert.match(source,/foreground\?\.37:\.55/)});

test("blue-noise thresholds are deterministic, uniform, and tile-sized",()=>{const first=createBlueNoiseThresholds(),second=createBlueNoiseThresholds(),histogram=new Uint16Array(256);assert.deepEqual(first,second);assert.equal(first.length,BLUE_NOISE_SIZE**2);for(const value of first)histogram[value]++;for(const count of histogram)assert.equal(count,16)});

test("backdrop uses unbiased adjacent-code stochastic quantization",()=>{const center=backdropColorAt(0,DEFAULT_AMBIENCE),edge=backdropColorAt(1,DEFAULT_AMBIENCE);assert.ok(center.reduce((sum,value)=>sum+value,0)>edge.reduce((sum,value)=>sum+value,0));const low=quantizeBackdropColor([3.4,10.4,20.4],.1),high=quantizeBackdropColor([3.4,10.4,20.4],.9);assert.deepEqual(low,[3,10,20]);assert.deepEqual(high,[4,11,21]);for(let channel=0;channel<3;channel++)assert.ok((high[channel]??0)-(low[channel]??0)<=1);const thresholds=createBlueNoiseThresholds(),mean=thresholds.reduce((sum,threshold)=>sum+quantizeBackdropColor([3.4,3.4,3.4],(threshold+.5)/256)[0],0)/thresholds.length;assert.ok(Math.abs(mean-3.4)<.01)});

test("CSS quantized gradients and overlay noise are removed",()=>{const styles=readFileSync(new URL("../styles.css",import.meta.url),"utf8"),source=readFileSync(new URL("../src/ambient-dust.ts",import.meta.url),"utf8");assert.doesNotMatch(styles,/beautiful-graph-view::before|feTurbulence|mix-blend-mode:soft-light/);assert.doesNotMatch(source,/radial-gradient|style\.filter/)});
