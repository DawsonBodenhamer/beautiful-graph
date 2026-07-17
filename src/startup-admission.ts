export function admitStartup(
  layoutReady:boolean,
  onLayoutReady:(ready:()=>void)=>void,
  metadataReady:boolean,
  onMetadataReady:(ready:()=>void)=>void,
  begin:()=>void,
):()=>void{
  let cancelled=false,started=false,layoutIsReady=layoutReady,metadataIsReady=metadataReady;
  const ready=()=>{if(cancelled||started||!layoutIsReady||!metadataIsReady)return;started=true;begin()};
  if(!layoutIsReady)onLayoutReady(()=>{layoutIsReady=true;ready()});
  if(!metadataIsReady)onMetadataReady(()=>{metadataIsReady=true;ready()});
  ready();
  return()=>{cancelled=true};
}

export function createStartupAutoFitGate():()=>boolean{
  let claimed=false;
  return()=>{if(claimed)return false;claimed=true;return true};
}

export function metadataGraphReady(
  markdownPaths:Iterable<string>,
  resolvedLinks:Readonly<Record<string,Readonly<Record<string,number>>>>,
  unresolvedLinks:Readonly<Record<string,Readonly<Record<string,number>>>>,
):boolean{
  const paths=[...markdownPaths];
  if(!paths.length)return true;
  const hasOwn=(record:Readonly<Record<string,unknown>>,path:string)=>Object.prototype.hasOwnProperty.call(record,path);
  return paths.every(path=>hasOwn(resolvedLinks,path)||hasOwn(unresolvedLinks,path));
}
