import assert from "node:assert/strict";
import test from "node:test";
import { getContrastTextColor } from "../src/color.ts";

test("uses dark text for bright pill colors", () => {
  assert.equal(getContrastTextColor("#ffb000"), "#000000");
  assert.equal(getContrastTextColor("#ffffff"), "#000000");
});

test("uses light text for dark pill colors", () => {
  assert.equal(getContrastTextColor("#1e3a8a"), "#ffffff");
  assert.equal(getContrastTextColor("#000000"), "#ffffff");
});

test("falls back to light text for invalid colors", () => {
  assert.equal(getContrastTextColor("not-a-color"), "#ffffff");
});

