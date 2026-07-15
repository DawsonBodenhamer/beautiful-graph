import assert from "node:assert/strict";
import test from "node:test";
import { acceptsHoverWhileDragging, beginDrag, dragPointerDisposition, endsPhysicsDrag, moveDrag, shouldClearHoverOnPointerOut, startsPhysicsDrag, suppressesPostDragTap } from "../src/drag-state.ts";

test("drag keeps the original node grab offset",()=>{const camera={scale:2,x:100,y:50},rect={left:20,top:30},start={x:160,y:100},node={x:30,y:20},state=beginDrag(7,start,node,rect,camera),moved=moveDrag(state,{x:200,y:140},rect,camera);assert.deepEqual(moved.position,{x:50,y:40});assert.equal(moved.state.moved,true)});
test("drag threshold is measured in client pixels",()=>{const state=beginDrag(1,{x:10,y:10},{x:10,y:10},{left:0,top:0},{scale:1,x:0,y:0});assert.equal(moveDrag(state,{x:13,y:14},{left:0,top:0},{scale:1,x:0,y:0}).state.moved,true)});
test("drag highlight excludes competing hover until release",()=>{assert.equal(acceptsHoverWhileDragging("held.md"),false);assert.equal(acceptsHoverWhileDragging(undefined),true)});
test("pointerout from any node cannot clear the held highlight",()=>{assert.equal(shouldClearHoverOnPointerOut("held.md"),false);assert.equal(shouldClearHoverOnPointerOut(undefined),true)});
test("post-drag tap suppression spans the synthetic tap window",()=>{assert.equal(suppressesPostDragTap(2999,3000),true);assert.equal(suppressesPostDragTap(3000,3000),false)});
test("drag pointer ownership survives capture loss until primary release",()=>{assert.equal(dragPointerDisposition(7,8,1),"foreign");assert.equal(dragPointerDisposition(7,7,1),"move");assert.equal(dragPointerDisposition(7,7,0),"release")});
test("physics drag lifecycle begins only after movement threshold",()=>{assert.equal(startsPhysicsDrag(false,false),false);assert.equal(startsPhysicsDrag(false,true),true);assert.equal(startsPhysicsDrag(true,true),false);assert.equal(endsPhysicsDrag(false),false);assert.equal(endsPhysicsDrag(true),true)});
