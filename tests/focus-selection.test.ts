import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expandedFocusIds, toggledFocusRoots } from "../src/focus-selection.ts";

const viewSource=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");

test("shift selection toggles roots without discarding prior nodes",()=>{let roots=toggledFocusRoots(new Set(),"a",false);roots=toggledFocusRoots(roots,"b",true);assert.deepEqual([...roots],["a","b"]);roots=toggledFocusRoots(roots,"a",true);assert.deepEqual([...roots],["b"])});
test("focus expansion is exactly the union of roots and direct neighbors",()=>{const adjacency=new Map([["a",new Set(["x","shared"])],["b",new Set(["y","shared"])],["x",new Set(["deep"])]]);assert.deepEqual([...expandedFocusIds(new Set(["a","b"]),adjacency)].sort(),["a","b","shared","x","y"])});
test("pointer release owns persistent click and Shift-click selection",()=>{assert.match(viewSource,/this\.pendingFocusAdditive=additive/);assert.match(viewSource,/this\.pinFocus\(node,moved\?false:additive\)/);assert.doesNotMatch(viewSource,/this\.focusPinned=false;this\.selectedFocusIds\.clear\(\);this\.dragged=node/)});
