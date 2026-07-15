import test from "node:test";
import assert from "node:assert/strict";
import { positionSnapshot, prunePositionSnapshot, savedLayoutStats } from "../src/layout-persistence.ts";

test("stale paths are pruned from exact position snapshots",()=>{const positions={a:{x:10,y:20},stale:{x:9000,y:9000},bad:{x:Number.NaN,y:0}},pruned=prunePositionSnapshot(positions,["a","bad"]);assert.deepEqual(pruned,{a:{x:10,y:20}});assert.deepEqual(positionSnapshot([{path:"a",x:1,y:2},{path:"bad",x:Infinity,y:0}]),{a:{x:1,y:2}})});
test("stale paths cannot influence saved span or centroid",()=>{const positions={a:{x:0,y:0},b:{x:100,y:40},stale:{x:10000,y:-10000}},stats=savedLayoutStats(positions,["a","b"]);assert.equal(stats.span,100);assert.deepEqual(stats.center,{x:50,y:20});assert.equal(stats.points.length,2)});
