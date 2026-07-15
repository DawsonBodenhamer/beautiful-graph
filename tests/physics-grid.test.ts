import test from "node:test";
import assert from "node:assert/strict";
import { collisionGridCellSize, routingGridCellSize } from "../src/physics-grid.ts";

test("collision-grid cost is independent of link distance",()=>{assert.equal(collisionGridCellSize(12),36);for(const distance of [0,100,1000,25000])assert.equal(collisionGridCellSize(12),36);assert.equal(routingGridCellSize(12,25000),600)});
