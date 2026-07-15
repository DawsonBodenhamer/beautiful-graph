export interface NumericControlSpec {
  min:number;
  max:number;
  step:number;
}

export function clampNumericValue(value:number,spec:NumericControlSpec):number {
  if(!Number.isFinite(value))return spec.min;
  return Math.max(spec.min,Math.min(spec.max,value));
}

export function numericDragMultiplier(shiftKey:boolean,ctrlKey:boolean):number {
  if(shiftKey)return .1;
  if(ctrlKey)return 10;
  return 1;
}

export function quantizeNumericValue(value:number,spec:NumericControlSpec):number {
  const clamped=clampNumericValue(value,spec),step=Math.max(Number.EPSILON,spec.step),steps=Math.round((clamped-spec.min)/step),quantized=spec.min+steps*step;
  return clampNumericValue(Number(quantized.toPrecision(15)),spec);
}

export function formatNumericValue(value:number):string {
  return String(value);
}

export function textFadeMaximum(maximumBaseRadius:number,nodeSize:number):number {
  const derived=Math.ceil(4*Math.max(0,maximumBaseRadius)*Math.max(0,nodeSize));
  return Math.min(4096,Math.max(80,derived));
}
