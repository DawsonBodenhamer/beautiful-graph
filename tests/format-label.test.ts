import assert from "node:assert/strict";
import test from "node:test";
import { formatGraphLabel, formatTooltipPath } from "../src/format-label.ts";

test("formats an index path as its folder hierarchy", () => {
  assert.equal(
    formatGraphLabel("wiki/projects/photonics_backport/index.md", true),
    "wiki > projects > photonics backport",
  );
});

test("formats a non-index note as its basename", () => {
  assert.equal(
    formatGraphLabel("wiki/projects/beautiful_graph/beautiful_graph_plan.md", true),
    "Beautiful Graph plan",
  );
});

test("preserves underscores when configured", () => {
  assert.equal(formatGraphLabel("wiki/projects/index.md", false), "wiki > projects");
  assert.equal(formatGraphLabel("wiki/my_note.md", false), "my_note");
});

test("normalizes Windows separators and case-insensitive index names", () => {
  assert.equal(formatGraphLabel("wiki\\projects\\INDEX.md", true), "wiki > projects");
});

test("collapses middle directories to the configured limit", () => {
  assert.equal(
    formatGraphLabel("raw/freelance_business/clients/campaigns/david_noel/index.md", true, 3),
    "raw > ... > david noel",
  );
  assert.equal(
    formatGraphLabel("raw/freelance_business/clients/campaigns/david_noel/index.md", true, 4),
    "raw > freelance business > ... > david noel",
  );
});

test("does not collapse paths within the configured limit", () => {
  assert.equal(
    formatGraphLabel("wiki/projects/index.md", true, 3),
    "wiki > projects",
  );
});

test("tooltip paths preserve both ends and collapse the middle", () => {
  assert.equal(
    formatTooltipPath("raw/freelance_business/ftk/clients/david_noel/youtube_data_analytics_trial/gmail_draft_your_list_punched_up_2026_07_08.md", 86),
    "Raw > Freelance Business > ... > Gmail Draft Your List Punched Up 2026 07 08.Md",
  );
});
