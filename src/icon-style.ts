export interface IconStyleMetrics {
  fontSize:number;
  shadowBlur:number;
  shadowDistance:number;
  padding:number;
}

export function iconStyleMetrics(renderedRadius:number):IconStyleMetrics {
  const radius=Math.max(0,renderedRadius),fontSize=radius*.9,shadowBlur=fontSize*.12,shadowDistance=fontSize*.06;
  return{fontSize,shadowBlur,shadowDistance,padding:Math.ceil(shadowBlur*2+shadowDistance)};
}
