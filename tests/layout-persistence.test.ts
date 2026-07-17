import test from "node:test";
import assert from "node:assert/strict";
import { positionSnapshot, prunePositionSnapshot, rankedPositionSnapshot } from "../src/layout-persistence.ts";
import { CURRENT_LAYOUT_REVISION, loadV2Positions, V2_DATA_VERSION } from "../src/layout-state.ts";
import { storedNodeCount } from "../src/settings-migration.ts";

test("stale paths are pruned from exact position snapshots",()=>{const positions={a:{x:10,y:20},stale:{x:9000,y:9000},bad:{x:Number.NaN,y:0}},pruned=prunePositionSnapshot(positions,["a","bad"]);assert.deepEqual(pruned,{a:{x:10,y:20}});assert.deepEqual(positionSnapshot([{path:"a",x:1,y:2},{path:"bad",x:Infinity,y:0}]),{a:{x:1,y:2}})});
test("stored snapshots rank active degree with a stable path tie and ignore radius",()=>{const nodes=[{path:"small",x:1,y:1,radius:100,degree:1},{path:"z",x:2,y:2,radius:1,degree:5},{path:"a",x:3,y:3,radius:50,degree:5},{path:"hub",x:4,y:4,radius:1,degree:8}];assert.deepEqual(rankedPositionSnapshot(nodes,3),{hub:{x:4,y:4},a:{x:3,y:3},z:{x:2,y:2}});assert.deepEqual(rankedPositionSnapshot(nodes,0),{})});
test("stored position count defaults to zero and clamps every boundary",()=>{assert.equal(storedNodeCount(undefined),0);assert.equal(storedNodeCount(-1),0);assert.equal(storedNodeCount(0),0);assert.equal(storedNodeCount(7.6),8);assert.equal(storedNodeCount(15),15);assert.equal(storedNodeCount(16),15)});
test("first V2 load discards legacy positions and layout revision",()=>{const legacy={a:{x:10,y:20}};assert.deepEqual(loadV2Positions(V2_DATA_VERSION-1,CURRENT_LAYOUT_REVISION,legacy),{});assert.deepEqual(loadV2Positions(V2_DATA_VERSION,CURRENT_LAYOUT_REVISION-1,legacy),{});assert.deepEqual(loadV2Positions(V2_DATA_VERSION,CURRENT_LAYOUT_REVISION,legacy),legacy)});
