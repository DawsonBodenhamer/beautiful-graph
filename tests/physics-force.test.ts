import test from "node:test";
import assert from "node:assert/strict";
import { linkSpringFactor, robustEnvelopeRadius } from "../src/physics-force.ts";

test("link distance is the sole spring equilibrium",()=>{assert.equal(linkSpringFactor(362.874,362.874,.041472,1,.65),0);assert.ok(linkSpringFactor(500,362.874,.041472,1,.65)>0);assert.ok(linkSpringFactor(200,362.874,.041472,1,.65)<0)});
test("sibling zero disables only the multiplied spring",()=>{assert.equal(linkSpringFactor(500,362.874,.041472,0,.65),0);assert.ok(linkSpringFactor(500,362.874,.041472,1,.65)>0)});
test("drag heat produces material linked-neighbor response",()=>{const distance=700,factor=linkSpringFactor(distance,362.874,.041472,1,.65),neighborAcceleration=distance*factor;assert.ok(neighborAcceleration>.5,`expected material response, got ${neighborAcceleration}`)});
test("robust envelope ignores a few extreme satellites",()=>{const core=Array.from({length:90},(_,index)=>({x:100+index%10,y:100+Math.floor(index/10)})),satellites=Array.from({length:10},(_,index)=>({x:5000+index*100,y:5000})),center={x:100,y:100},radius=robustEnvelopeRadius([...core,...satellites],center,300);assert.equal(radius,300);assert.ok(Math.hypot(satellites[0]!.x-center.x,satellites[0]!.y-center.y)>radius)});
