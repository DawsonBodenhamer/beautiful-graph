import test from "node:test";
import assert from "node:assert/strict";
import { SnapshotWriteQueue } from "../src/snapshot-write-queue.ts";

test("snapshot writes stay ordered when earlier writes resolve late",async()=>{
  const queue=new SnapshotWriteQueue<{value:number}>(),started:number[]=[],finished:number[]=[],resolvers=new Map<number,()=>void>(),writer=async(snapshot:{value:number})=>{started.push(snapshot.value);await new Promise<void>(resolve=>resolvers.set(snapshot.value,resolve));finished.push(snapshot.value)};
  const state={value:1},one=queue.enqueue(state,writer);state.value=2;const two=queue.enqueue(state,writer);state.value=3;
  await Promise.resolve();assert.deepEqual(started,[1]);resolvers.get(1)?.();await one;await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(started,[1,2]);resolvers.get(2)?.();await two;
  assert.deepEqual(finished,[1,2]);
});

test("snapshots are immutable after enqueue",async()=>{
  const queue=new SnapshotWriteQueue<{nested:{value:number}}>(),seen:number[]=[],state={nested:{value:1}},write=queue.enqueue(state,async snapshot=>{seen.push(snapshot.nested.value)});state.nested.value=9;await write;assert.deepEqual(seen,[1]);
});
