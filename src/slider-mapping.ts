export function valueFromMappedPosition(position:number,min:number,mid:number,max:number):number {
  const normalized=Math.max(0,Math.min(100,position));
  return normalized<=50?min+(mid-min)*(normalized/50):mid+(max-mid)*((normalized-50)/50);
}

export function mappedPositionFromValue(value:number,min:number,mid:number,max:number):number {
  const position=value<=mid?50*(value-min)/Math.max(.0001,mid-min):50+50*(value-mid)/Math.max(.0001,max-mid);
  return Math.max(0,Math.min(100,position));
}
