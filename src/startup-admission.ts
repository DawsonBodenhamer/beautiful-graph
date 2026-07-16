export function admitStartup(
  layoutReady:boolean,
  onLayoutReady:(ready:()=>void)=>void,
  begin:()=>void,
):()=>void{
  let cancelled=false,started=false;
  const ready=()=>{if(cancelled||started)return;started=true;begin()};
  if(layoutReady)ready();else onLayoutReady(ready);
  return()=>{cancelled=true};
}
