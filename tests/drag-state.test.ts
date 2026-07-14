import assert from "node:assert/strict";
import test from "node:test";
import { acceptsHoverWhileDragging, beginDrag, dragReleaseAction, moveDrag, suppressesPostDragTap } from "../src/drag-state.ts";

test("drag keeps the original node grab offset",()=>{const camera={scale:2,x:100,y:50},rect={left:20,top:30},start={x:160,y:100},node={x:30,y:20},state=beginDrag(7,start,node,rect,camera),moved=moveDrag(state,{x:200,y:140},rect,camera);assert.deepEqual(moved.position,{x:50,y:40});assert.equal(moved.state.moved,true)});
test("drag threshold is measured in client pixels",()=>{const state=beginDrag(1,{x:10,y:10},{x:10,y:10},{left:0,top:0},{scale:1,x:0,y:0});assert.equal(moveDrag(state,{x:13,y:14},{left:0,top:0},{scale:1,x:0,y:0}).state.moved,true)});
test("drag highlight excludes competing hover until release",()=>{assert.equal(acceptsHoverWhileDragging("held.md"),false);assert.equal(acceptsHoverWhileDragging(undefined),true)});
test("unmoved click pins while moved or cancelled drag clears",()=>{assert.equal(dragReleaseAction(false,false),"pin");assert.equal(dragReleaseAction(true,false),"clear");assert.equal(dragReleaseAction(false,true),"clear")});
test("post-drag tap suppression spans the synthetic tap window",()=>{assert.equal(suppressesPostDragTap(2999,3000),true);assert.equal(suppressesPostDragTap(3000,3000),false)});
