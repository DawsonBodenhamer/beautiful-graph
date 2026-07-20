import test from "node:test";
import assert from "node:assert/strict";
import { registerNodeClick } from "../src/node-click.ts";

test("two timely unmoved clicks on the same node form one double click",()=>{const first=registerNodeClick(undefined,"a",1000,false),second=registerNodeClick(first.next,"a",1320,false);assert.equal(first.doubleClick,false);assert.equal(second.doubleClick,true);assert.equal(second.next,undefined)});
test("movement, timeout, and a different node prevent double click",()=>{const first=registerNodeClick(undefined,"a",1000,false);assert.equal(registerNodeClick(first.next,"a",1401,false).doubleClick,false);assert.equal(registerNodeClick(first.next,"b",1200,false).doubleClick,false);assert.deepEqual(registerNodeClick(first.next,"a",1200,true),{doubleClick:false,next:undefined})});
