import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

test("V2 conformance scenarios contain protocol-safe numeric state only", () => {
  const fixture = readJson("./fixtures/conformance/scenarios.json");
  assert.equal(fixture.schema, 1);
  assert.equal(fixture.protocolVersion, 1);
  assert.equal(fixture.wasmAbiVersion, 1);
  assert.ok(fixture.scenarios.length >= 4);
  const ids = new Set<string>();
  for (const scenario of fixture.scenarios) {
    assert.match(scenario.id, /^[a-z0-9_]+$/);
    assert.ok(!ids.has(scenario.id));
    ids.add(scenario.id);
    assert.ok(scenario.sourceSections.length > 0);
    assert.ok(Number.isFinite(scenario.tolerance) && scenario.tolerance >= 0);
    const nodeIds = new Set<string>();
    for (const node of scenario.nodes) {
      assert.match(node.id, /^n\d+$/);
      assert.ok(!nodeIds.has(node.id));
      nodeIds.add(node.id);
      for (const key of ["x", "y", "vx", "vy", "weight", "collisionRadius"] as const) assert.ok(Number.isFinite(node[key]));
      for (const key of ["fx", "fy"] as const) assert.ok(node[key] === null || Number.isFinite(node[key]));
      assert.ok(node.collisionRadius >= 60);
      assert.deepEqual(Object.keys(node).sort(), ["collisionRadius", "fx", "fy", "id", "vx", "vy", "weight", "x", "y"]);
    }
    for (const link of scenario.links) {
      assert.ok(nodeIds.has(link.source));
      assert.ok(nodeIds.has(link.target));
      assert.notEqual(link.source, link.target);
    }
  }
});

test("V2 parity matrix assigns every rule to one proof owner", () => {
  const matrix = readJson("./fixtures/conformance/parity_matrix.json");
  assert.equal(matrix.schema, 1);
  assert.match(matrix.authority, /obsidian_default_graph_physics\.md$/);
  assert.ok(matrix.requirements.length >= 20);
  const ids = matrix.requirements.map((requirement: { id: string }) => requirement.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const requirement of matrix.requirements) {
    assert.match(requirement.id, /^[a-z0-9_]+$/);
    assert.ok(requirement.sourceSection.length > 0);
    assert.ok(requirement.owner.length > 0);
    assert.ok(requirement.proof.length > 0);
  }
});

test("V2 artifact manifest requires the complete deployable set", () => {
  const manifest = readJson("../config/v2_artifacts.json");
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.releaseVersion, "2.0.0");
  assert.deepEqual(manifest.artifacts.map((artifact: { path: string }) => artifact.path), [
    "main.js",
    "graph-worker.js",
    "graph-sim.wasm",
    "manifest.json",
    "styles.css",
  ]);
  assert.ok(manifest.artifacts.every((artifact: { required: boolean; producer: string }) => artifact.required && artifact.producer));
});

