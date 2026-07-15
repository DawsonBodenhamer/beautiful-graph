import assert from "node:assert/strict";
import test from "node:test";
import { captureResponsiveCamera, fitCamera, restoreResponsiveCamera, viewportCenter } from "../src/camera.ts";

const bounds={minX:-500,maxX:500,minY:-350,maxY:350};
test("fit camera uses proportional leaf padding",()=>{const camera=fitCamera(bounds,{width:1400,height:900});assert.equal(camera.x,700);assert.equal(camera.y,450);assert.ok(camera.scale>.9&&camera.scale<1.3)});
test("responsive camera preserves world center and relative zoom",()=>{const oldViewport={width:1200,height:800},base=fitCamera(bounds,oldViewport),camera={scale:base.scale*1.4,x:600-80*base.scale*1.4,y:400+25*base.scale*1.4},state=captureResponsiveCamera(camera,oldViewport,bounds),next=restoreResponsiveCamera(state,{width:1900,height:1200},bounds),roundTrip=captureResponsiveCamera(next,{width:1900,height:1200},bounds);assert.ok(Math.abs(roundTrip.centerX-80)<1e-9);assert.ok(Math.abs(roundTrip.centerY+25)<1e-9);assert.ok(Math.abs(roundTrip.zoomRatio-1.4)<1e-9)});
test("bottom overlay inset centers the graph in the unobscured viewport",()=>{const viewport={width:1000,height:800,insetBottom:80},center=viewportCenter(viewport),camera=fitCamera({minX:-100,maxX:100,minY:-100,maxY:100},viewport);assert.deepEqual(center,{x:500,y:360,width:1000,height:720});assert.equal(camera.x,500);assert.equal(camera.y,360)});
