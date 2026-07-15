import test from "node:test";
import assert from "node:assert/strict";
import { CURRENT_LAYOUT_REVISION, persistedLayoutRevision } from "../src/layout-state.ts";

test("layout revision is a validated algorithm version",()=>{assert.equal(persistedLayoutRevision(undefined),0);assert.equal(persistedLayoutRevision(-1),0);assert.equal(persistedLayoutRevision(1.5),0);assert.equal(persistedLayoutRevision(CURRENT_LAYOUT_REVISION),CURRENT_LAYOUT_REVISION)});
