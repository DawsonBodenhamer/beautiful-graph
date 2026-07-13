import test from "node:test";import assert from "node:assert/strict";import {isPathInFolder,lensRadius,unionLensMembership} from "../src/folder-lens.ts";
test("folder membership respects path boundaries",()=>{assert.equal(isPathInFolder("raw/a.md","raw"),true);assert.equal(isPathInFolder("rawish/a.md","raw"),false)});
test("lens radius is bounded and configurable",()=>{assert.equal(lensRadius(1,1,1),18);assert.equal(lensRadius(100,100,1),70);assert.equal(lensRadius(4,20,2),36)});
test("lens membership unions recursive folders",()=>{assert.deepEqual([...unionLensMembership(["raw/a.md","raw/x/b.md","wiki/a.md"],["raw"])],["raw/a.md","raw/x/b.md"])});
