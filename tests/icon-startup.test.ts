import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { iconStyleMetrics } from "../src/icon-style.ts";

const source=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8");

test("icons receive their rendered node size when first created",()=>{
  assert.match(source,/ensureIcon\(view:NodeView,renderedRadius:number\)/);
  assert.match(source,/iconStyleMetrics\(renderedRadius\)/);
  assert.match(source,/this\.ensureIcon\(view,r\)/);
  assert.doesNotMatch(source,/fontSize:12,dropShadow/);
});

test("icon shadow scales proportionally without zoom-resolution jumps",()=>{
  const small=iconStyleMetrics(20),large=iconStyleMetrics(40);
  assert.equal(large.fontSize,small.fontSize*2);
  assert.equal(large.shadowBlur,small.shadowBlur*2);
  assert.equal(large.shadowDistance,small.shadowDistance*2);
  assert.ok(Math.abs(small.shadowBlur-small.fontSize*.12)<Number.EPSILON);
  assert.ok(Math.abs(small.shadowDistance-small.fontSize*.06)<Number.EPSILON);
  assert.equal(small.padding,Math.ceil(small.shadowBlur*2+small.shadowDistance));
  assert.match(source,/padding:metrics\.padding/);
  assert.match(source,/alpha:\.5/);
  assert.doesNotMatch(source,/icon\.resolution\s*=|this\.scale>2\.5\?8/);
});
