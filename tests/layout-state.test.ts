import test from "node:test";
import assert from "node:assert/strict";
import { completedLayoutRevision, CURRENT_LAYOUT_REVISION, layoutNeedsConvergence, persistedLayoutRevision } from "../src/layout-state.ts";

test("schema persistence cannot complete an absent layout revision",()=>{assert.equal(persistedLayoutRevision(undefined),0);assert.equal(layoutNeedsConvergence(undefined),true);assert.equal(layoutNeedsConvergence(CURRENT_LAYOUT_REVISION),false)});
test("interrupted or incomplete convergence remains pending",()=>{assert.equal(completedLayoutRevision(0,false),0);assert.equal(layoutNeedsConvergence(completedLayoutRevision(0,false)),true)});
test("only accepted convergence advances the durable layout revision",()=>{assert.equal(completedLayoutRevision(0,true),CURRENT_LAYOUT_REVISION);assert.equal(layoutNeedsConvergence(completedLayoutRevision(0,true)),false)});
