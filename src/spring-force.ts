export function springExtension(distance:number,restLength:number,compliance:number):number {
  const rest=Math.max(1,restLength),strain=(distance-rest)/rest,c=Math.max(-1,Math.min(1,compliance)),gain=Math.max(.2,Math.min(5,Math.exp(-c*Math.min(4,Math.abs(strain)))));
  return(distance-rest)*gain;
}

export function degreeNormalizedSpringStrength(degreeA:number,degreeB:number):number {
  return 1/Math.sqrt(Math.max(1,Math.min(Math.max(1,degreeA),Math.max(1,degreeB))));
}
