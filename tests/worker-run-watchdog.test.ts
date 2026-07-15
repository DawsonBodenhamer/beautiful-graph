import test from "node:test";
import assert from "node:assert/strict";
import { THOROUGH_ANALYSIS_TIMEOUT_MS, WorkerRunWatchdog, workerFailureRecovery } from "../src/worker-run-watchdog.ts";

type Handle={callback:()=>void;delay:number;canceled:boolean};

function fixture(){
  const handles:Handle[]=[];
  const watchdog=new WorkerRunWatchdog<object>(THOROUGH_ANALYSIS_TIMEOUT_MS,(callback,delay)=>{const handle={callback,delay,canceled:false};handles.push(handle);return handle},raw=>{(raw as Handle).canceled=true});
  return{watchdog,handles};
}

test("terminal completion immediately before the deadline cancels timeout",()=>{
  const{watchdog,handles}=fixture(),worker={};let timedOut=0;watchdog.arm(worker,1,()=>timedOut++);assert.equal(handles[0]!.delay,60_000);assert.equal(watchdog.clear(worker,1),true);handles[0]!.callback();assert.equal(timedOut,0);assert.equal(handles[0]!.canceled,true);
});

test("active deadline finalizes once and can be retried with a fresh worker",()=>{
  const{watchdog,handles}=fixture(),first={},second={};let timedOut=0;watchdog.arm(first,1,()=>timedOut++);handles[0]!.callback();handles[0]!.callback();assert.equal(timedOut,1);watchdog.arm(second,2,()=>timedOut++);assert.equal(watchdog.matches(second,2),true);handles[1]!.callback();assert.equal(timedOut,2);
});

test("stale callbacks cannot terminate a replacement generation",()=>{
  const{watchdog,handles}=fixture(),first={},second={};let firstTimeouts=0,secondTimeouts=0;watchdog.arm(first,1,()=>firstTimeouts++);watchdog.arm(second,2,()=>secondTimeouts++);handles[0]!.callback();assert.equal(firstTimeouts,0);assert.equal(watchdog.matches(second,2),true);handles[1]!.callback();assert.equal(secondTimeouts,1);
});

test("close-style clear cancels the active deadline",()=>{
  const{watchdog,handles}=fixture(),worker={};let timedOut=0;watchdog.arm(worker,1,()=>timedOut++);watchdog.clear();handles[0]!.callback();assert.equal(timedOut,0);assert.equal(handles[0]!.canceled,true);
});

test("worker failure recovery never persists or marks partial startup coordinates",()=>{
  assert.deepEqual(workerFailureRecovery(true),{revealStartup:true,persistPositions:false,markLayoutConverged:false});assert.deepEqual(workerFailureRecovery(false),{revealStartup:false,persistPositions:false,markLayoutConverged:false});
});
