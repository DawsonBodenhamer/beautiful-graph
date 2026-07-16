import test from "node:test";
import assert from "node:assert/strict";
import { freeNodeCentroid, removeRigidVelocity, restoreFreeCentroid } from "../src/rigid-motion.ts";

test("rigid translation and rotation are projected out of free-node velocity",()=>{
  const nodes=[{x:-10,y:0,vx:5,vy:-2},{x:10,y:0,vx:5,vy:4},{x:0,y:20,vx:-1,vy:1}];
  removeRigidVelocity(nodes);
  const mean={x:nodes.reduce((sum,node)=>sum+node.vx,0)/nodes.length,y:nodes.reduce((sum,node)=>sum+node.vy,0)/nodes.length},center=freeNodeCentroid(nodes),angular=nodes.reduce((sum,node)=>sum+(node.x-center.x)*node.vy-(node.y-center.y)*node.vx,0);
  assert.ok(Math.abs(mean.x)<1e-12);assert.ok(Math.abs(mean.y)<1e-12);assert.ok(Math.abs(angular)<1e-10);
});

test("centroid restoration translates only free nodes and preserves their relative geometry",()=>{
  const nodes=[{x:20,y:30,vx:0,vy:0,lastX:20,lastY:30},{x:40,y:50,vx:0,vy:0,lastX:40,lastY:50},{x:99,y:99,vx:0,vy:0,fx:99,fy:99,lastX:99,lastY:99}],before={dx:20,dy:20};
  restoreFreeCentroid(nodes,{x:0,y:0,count:2});const center=freeNodeCentroid(nodes);
  assert.deepEqual(center,{x:0,y:0,count:2});assert.equal(nodes[1]!.x-nodes[0]!.x,before.dx);assert.equal(nodes[1]!.y-nodes[0]!.y,before.dy);assert.deepEqual(nodes[2],{x:99,y:99,vx:0,vy:0,fx:99,fy:99,lastX:99,lastY:99});
});
