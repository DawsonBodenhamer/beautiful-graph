import assert from "node:assert/strict";
import test from "node:test";
import { SettingsHistory } from "../src/settings-history.ts";

test("undo and redo preserve total order and invalidate redo after committed edit",()=>{const h=new SettingsHistory<{value:number}>(10);let state={value:0};h.recordBefore(state);state={value:1};h.commit(state);h.recordBefore(state);state={value:2};h.commit(state);state=h.undo(state)!;assert.equal(state.value,1);state=h.undo(state)!;assert.equal(state.value,0);state=h.redo(state)!;assert.equal(state.value,1);h.recordBefore(state);state={value:9};h.commit(state);assert.equal(h.canRedo,false);assert.equal(h.undo(state)!.value,1)});
test("no-op gestures do not enter history or invalidate redo",()=>{const h=new SettingsHistory<{value:number}>(10);let state={value:0};h.recordBefore(state);state={value:1};h.commit(state);state=h.undo(state)!;assert.equal(h.canRedo,true);h.recordBefore(state);assert.equal(h.commit(state),false);assert.equal(h.canRedo,true);assert.equal(h.redo(state)!.value,1)});
