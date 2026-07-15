import assert from "node:assert/strict";
import test from "node:test";
import { orphanAllowed, thresholdFade } from "../src/presentation.ts";

test("threshold fade is smooth and symmetric around its threshold",()=>{
  assert.equal(thresholdFade(0,24),0);
  assert.equal(thresholdFade(24,24),.5);
  assert.equal(thresholdFade(100,24),1);
});

test("orphan visibility only filters degree-zero nodes",()=>{
  assert.equal(orphanAllowed(0,true),true);
  assert.equal(orphanAllowed(0,false),false);
  assert.equal(orphanAllowed(1,false),true);
});
