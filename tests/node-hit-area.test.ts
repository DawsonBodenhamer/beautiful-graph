import test from "node:test";
import assert from "node:assert/strict";
import { textureCircleContains } from "../src/node-hit-area.ts";

test("node hit area uses texture-local radius independent of rendered node size", () => {
  assert.equal(textureCircleContains(127.9, 0, 256, 256), true);
  assert.equal(textureCircleContains(128.1, 0, 256, 256), false);
  assert.equal(textureCircleContains(0, 127.9, 256, 512), true);
});

test("node hit area rejects invalid or empty textures", () => {
  assert.equal(textureCircleContains(0, 0, 0, 256), false);
  assert.equal(textureCircleContains(0, 0, Number.NaN, 256), false);
});
