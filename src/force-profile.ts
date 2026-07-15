import type { GraphForces } from "./types.ts";
import { DEFAULT_FORCES } from "./defaults.ts";

const clamp=(min:number,max:number,value:number)=>Math.max(min,Math.min(max,value));

export function analyzedForceProfile(nodeCount:number,averageDegree:number,familyCount:number,current:GraphForces):GraphForces {
  const count=Math.max(1,nodeCount),degree=Math.max(.25,averageDegree),families=Math.max(1,familyCount),countScale=clamp(.72,1.38,Math.sqrt(count/1061)),degreeScale=clamp(.78,1.24,Math.sqrt(4.11/degree));
  return {
    ...current,
    center:Number((DEFAULT_FORCES.center*Math.pow(countScale,.22)).toFixed(3)),
    repel:Number((DEFAULT_FORCES.repel/Math.pow(countScale,.32)).toFixed(3)),
    siblingLinkForce:Number((DEFAULT_FORCES.siblingLinkForce*degreeScale).toFixed(3)),
    rootLinkForce:Number(clamp(.25,1,1.5/Math.sqrt(families)).toFixed(3)),
    link:Number((DEFAULT_FORCES.link*degreeScale).toFixed(4)),
    distance:Math.round(DEFAULT_FORCES.distance*clamp(.82,1.28,1/countScale)),
  };
}
