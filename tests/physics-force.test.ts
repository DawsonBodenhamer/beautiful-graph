import test from "node:test";
import assert from "node:assert/strict";
import { familyComponentIds, linkSpringImpulse } from "../src/physics-force.ts";

test("link distance is the sole spring equilibrium",()=>{const atRest=linkSpringImpulse({x:0,y:0},{x:362.874,y:0},362.874,.041472,1,.65),long=linkSpringImpulse({x:0,y:0},{x:500,y:0},362.874,.041472,1,.65),short=linkSpringImpulse({x:0,y:0},{x:200,y:0},362.874,.041472,1,.65);assert.equal(atRest.magnitude,0);assert.ok(long.magnitude>0);assert.ok(short.magnitude<0)});
test("sibling zero disables only the multiplied spring",()=>{assert.equal(linkSpringImpulse({x:0,y:0},{x:500,y:0},362.874,.041472,0,.65).magnitude,0);assert.ok(linkSpringImpulse({x:0,y:0},{x:500,y:0},362.874,.041472,1,.65).magnitude>0)});
test("drag heat produces material degree-biased neighbor response",()=>{const impulse=linkSpringImpulse({x:0,y:0,degree:20},{x:700,y:0,degree:1},362.874,.041472,1,.65);assert.ok(Math.abs(impulse.target.x)>.5);assert.ok(Math.abs(impulse.target.x)>Math.abs(impulse.source.x))});
test("far-link impulse is normalized and bounded instead of quadratic",()=>{const far=linkSpringImpulse({x:0,y:0},{x:5000,y:0},362.874,.041472,1,1),farther=linkSpringImpulse({x:0,y:0},{x:50000,y:0},362.874,.041472,1,1);assert.equal(far.magnitude,8);assert.equal(farther.magnitude,8)});
test("family-local components ignore cross-family edges and retain singletons",()=>{const nodes=[{id:"a",family:"index-a"},{id:"b",family:"index-a"},{id:"c",family:"index-a"},{id:"d",family:"index-b"}],ids=familyComponentIds(nodes,[{source:"a",target:"b"},{source:"b",target:"d"}]);assert.equal(ids.get("a"),ids.get("b"));assert.notEqual(ids.get("b"),ids.get("c"));assert.notEqual(ids.get("b"),ids.get("d"))});
