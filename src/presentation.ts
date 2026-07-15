export function thresholdFade(screenRadius:number,threshold:number):number {
  const band=Math.max(1.5,threshold*.075);
  const raw=Math.max(0,Math.min(1,(screenRadius-threshold)/band+.5));
  return raw*raw*(3-2*raw);
}

export function orphanAllowed(degree:number,showOrphans:boolean):boolean {
  return showOrphans||degree>0;
}
