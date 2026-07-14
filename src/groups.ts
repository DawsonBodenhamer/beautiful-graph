import type { GraphEdge, GraphGroup, GraphNode } from "./types";

export const GROUP_PALETTES:Record<string,string[]>={
  "Beautiful Default":["#20B2CF","#1FDB2C","#4E606E","#D37203","#F5B82E","#EC6A8D","#44D7B6","#B7E34B","#F58CCB","#70D6FF"],
  "Catppuccin Mocha":["#89B4FA","#A6E3A1","#FAB387","#CBA6F7","#F38BA8","#94E2D5","#F9E2AF","#B4BEFE"],
  "Tokyo Night Moon":["#FF757F","#4FD6BE","#FFC777","#82AAFF","#C099FF","#86E1FC","#C3E88D","#FCA7EA"],
  "Nord Aurora":["#5E81AC","#BF616A","#A3BE8C","#D08770","#B48EAD","#88C0D0","#EBCB8B","#81A1C1"],
  "High Discrimination":["#E31A1C","#33A02C","#1F78B4","#FF7F00","#6A3D9A","#B15928","#00BFC4","#F781BF"],
  "Gruvbox Dark":["#FB4934","#B8BB26","#83A598","#FE8019","#D3869B","#8EC07C","#FABD2F","#CC241D"]
};
export const GROUP_PALETTE=GROUP_PALETTES["Beautiful Default"]!;
export const OTHER_COLOR="#454A53";
export const ROOT_INDEX_COLOR="#FFBB00";
export const inFolder=(path:string,root:string):boolean=>!root||path===root||path.startsWith(`${root}/`);
export function effectiveGroup(path:string,groups:GraphGroup[]):GraphGroup|undefined{return groups.filter(g=>inFolder(path,g.root)).sort((a,b)=>b.root.length-a.root.length||a.order-b.order)[0]}
export function nodeAllowed(path:string,groups:GraphGroup[],otherVisible:boolean):boolean{const matches=groups.filter(g=>inFolder(path,g.root));if(!matches.length)return otherVisible;return matches.every(g=>g.visible)}
export function displayDirectory(value:string,replaceUnderscores:boolean,capitalize:boolean):string{let out=replaceUnderscores?value.replaceAll("_"," "):value;return capitalize?out.replace(/(^|[ _-])[a-z]/g,m=>m.toUpperCase()):out}
export function normalizeIcon(value:string):string{const text=value.trim();if(!text)return "";const Segmenter=(Intl as unknown as {Segmenter?:new(...args:unknown[])=>{segment:(s:string)=>Iterable<{segment:string}>}}).Segmenter;return Segmenter?[...new Segmenter(undefined,{granularity:"grapheme"}).segment(text)][0]?.segment??"":[...text][0]??""}
export function defaultGroupIcon(root:string):string{const name=root.split("/")[0]?.toLowerCase();return name==="dev"?"🛠️":name==="outputs"?"📦":name==="raw"?"🧺":name==="wiki"?"📜":"📁"}
export function inferGroups(nodes:GraphNode[]):GraphGroup[]{const roots=[...new Set(nodes.map(n=>n.path.split("/")[0]).filter((root):root is string=>!!root&&nodes.some(n=>n.path.startsWith(`${root}/`))))].sort();return roots.map((root,i)=>({id:`auto:${root}`,root,color:GROUP_PALETTE[i%GROUP_PALETTE.length]!,icon:defaultGroupIcon(root),visible:true,origin:"auto",order:i}))}

export function analyzeAutoGroups(nodes:GraphNode[],edges:GraphEdge[],existing:GraphGroup[]):{groups:GraphGroup[];added:number;retained:number;removed:number;covered:number}{
  const validPaths=new Set(nodes.map(node=>node.path)),manual=existing.filter(group=>group.origin==="manual"&&nodes.some(node=>inFolder(node.path,group.root))),automatic=existing.filter(group=>group.origin==="auto"),ownedByManual=(path:string)=>manual.some(group=>inFolder(path,group.root)),unclaimed=nodes.filter(node=>!ownedByManual(node.path)),target=Math.max(8,Math.ceil(unclaimed.length/10)),candidates=new Map<string,Set<string>>();
  for(const node of unclaimed){const parts=node.path.split("/");parts.pop();for(let depth=1;depth<=parts.length;depth++){const root=parts.slice(0,depth).join("/");if(manual.some(group=>root===group.root||inFolder(root,group.root)))continue;const set=candidates.get(root)??new Set<string>();set.add(node.id);candidates.set(root,set)}}
  const scored=[...candidates].filter(([,ids])=>ids.size>=8).map(([root,ids])=>{let internal=0,boundary=0;for(const edge of edges){const a=ids.has(edge.source),b=ids.has(edge.target);if(a&&b)internal++;else if(a!==b&&(a||b)&&validPaths.has(edge.source)&&validPaths.has(edge.target))boundary++}const count=ids.size,coverage=Math.min(1,count/target),cohesion=internal/Math.max(1,internal+boundary),balance=Math.max(0,1-Math.abs(count-target)/Math.max(count,target)),score=.45*cohesion+.35*balance+.2*coverage;return{root,ids,count,cohesion,score}}).sort((a,b)=>b.score-a.score||b.cohesion-a.cohesion||b.count-a.count||b.root.split("/").length-a.root.split("/").length||a.root.localeCompare(b.root));
  const selected:typeof scored=[];for(const candidate of scored){if(selected.length>=10)break;if(selected.some(chosen=>inFolder(candidate.root,chosen.root)||inFolder(chosen.root,candidate.root)))continue;selected.push(candidate)}
  const prior=new Map(automatic.map(group=>[group.root,group])),auto=selected.map((candidate,index)=>{const old=prior.get(candidate.root);return old?{...old,order:index}:{id:`auto:${candidate.root}`,root:candidate.root,color:GROUP_PALETTE[index%GROUP_PALETTE.length]!,icon:defaultGroupIcon(candidate.root),visible:true,origin:"auto" as const,order:index}}),groups=[...auto,...manual].map((group,index)=>({...group,order:index})),selectedRoots=new Set(auto.map(group=>group.root));return{groups,added:auto.filter(group=>!prior.has(group.root)).length,retained:auto.filter(group=>prior.has(group.root)).length+manual.length,removed:automatic.filter(group=>!selectedRoots.has(group.root)).length,covered:new Set(selected.flatMap(item=>[...item.ids])).size}
}
