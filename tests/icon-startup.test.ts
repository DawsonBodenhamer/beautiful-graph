import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");

test("icons receive their rendered node size when first created",()=>{
  assert.match(source,/ensureIcon\(view:NodeView,renderedRadius:number\)/);
  assert.match(source,/fontSize:renderedRadius\*\.9/);
  assert.match(source,/this\.ensureIcon\(view,r\)/);
  assert.doesNotMatch(source,/fontSize:12,dropShadow/);
});
