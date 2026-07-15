import test from "node:test";
import assert from "node:assert/strict";
import { analyzedForceProfile } from "../src/force-profile.ts";
import { DEFAULT_FORCES } from "../src/defaults.ts";

test("the 1061-node force profile is anchored to the saved graph values",()=>{const result=analyzedForceProfile(1061,4.11,4,DEFAULT_FORCES);assert.equal(result.center,1.48);assert.equal(result.repel,2.28);assert.equal(result.siblingLinkForce,15);assert.equal(result.link,.034);assert.equal(result.distance,51);assert.equal(result.rootLinkForce,.75)});
test("analysis changes with topology while preserving curvature",()=>{const result=analyzedForceProfile(250,1,9,{...DEFAULT_FORCES,curvature:-.4});assert.equal(result.curvature,-.4);assert.notEqual(result.distance,DEFAULT_FORCES.distance);assert.ok(result.rootLinkForce<.75)});
