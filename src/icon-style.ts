export interface IconStyleMetrics {
  fontSize:number;
  shadowBlur:number;
  shadowDistance:number;
}

export function iconStyleMetrics(renderedRadius:number):IconStyleMetrics {
  const radius=Math.max(0,renderedRadius);
  return{fontSize:radius*.9,shadowBlur:radius*.5,shadowDistance:radius*.18};
}
