import test from "node:test";
import assert from "node:assert/strict";
import { degreeNormalizedSpringStrength, springExtension } from "../src/spring-force.ts";

test("link distance is the sole zero-force rest length",()=>{for(const compliance of [-1,0,.08224,1])assert.equal(springExtension(362.874,362.874,compliance),0)});
test("positive compliance softens and negative compliance stiffens strain",()=>{const linear=Math.abs(springExtension(800,300,0));assert.ok(Math.abs(springExtension(800,300,1))<linear);assert.ok(Math.abs(springExtension(800,300,-1))>linear)});
test("degree normalization reduces hub spring strength deterministically",()=>{assert.equal(degreeNormalizedSpringStrength(1,100),1);assert.ok(degreeNormalizedSpringStrength(25,100)<degreeNormalizedSpringStrength(4,100))});
