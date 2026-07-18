import test from "node:test";
import assert from "node:assert/strict";
import { resolvePanelPosition } from "../src/panel-layout.ts";

test("pinned panels hug their assigned three-percent margins",()=>{
  assert.deepEqual(resolvePanelPosition("groups",true,.4,.4,1000,800,200,300),{x:30,y:24});
  assert.deepEqual(resolvePanelPosition("ambience",true,.4,.4,1000,800,200,300),{x:770,y:24});
  assert.deepEqual(resolvePanelPosition("forces",true,.4,.4,1000,800,200,200),{x:30,y:576});
  assert.deepEqual(resolvePanelPosition("display",true,.4,.4,1000,800,200,250),{x:770,y:526});
});

test("unpinned panels preserve and clamp their normalized position",()=>{
  assert.deepEqual(resolvePanelPosition("display",false,.4,.25,1000,800,200,250),{x:400,y:200});
  assert.deepEqual(resolvePanelPosition("display",false,.99,.99,1000,800,200,250),{x:770,y:526});
});
