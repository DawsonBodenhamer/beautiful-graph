import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/graph-view.ts",import.meta.url),"utf8"),styles=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("forces are flat numeric rows with a root-link control",()=>{assert.doesNotMatch(source,/Advanced links/);assert.match(source,/"rootLinkForce","Root link force"/);assert.match(source,/"link","Link force"/);assert.match(source,/"distance","Link distance"/);assert.match(source,/"curvature","Link curvature"/)});
test("all preset panels expose the shared selector and Save preset wording",()=>{assert.match(source,/beautiful-groups-presets-/);assert.match(source,/input\.setAttr\("list",id\)/);assert.doesNotMatch(source,/text:"Save"/);assert.ok((source.match(/text:"Save preset"/g)??[]).length>=2);assert.doesNotMatch(styles,/grid-template-columns:1fr auto auto auto/)});
test("base pills and tethers are inside the blurred scene while focus copies stay crisp",()=>{assert.match(source,/this\.world\.addChild\(this\.territoryLayer,this\.links,this\.glowLayer,this\.nodeLayer,this\.leaderLayer,this\.labelLayer\)/);assert.match(source,/this\.focusWorld\.addChild\(this\.focusLinks,this\.focusGlowLayer,this\.focusNodeLayer,this\.focusLeaderLayer,this\.focusLabelLayer\)/)});
