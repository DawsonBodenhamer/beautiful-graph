import type { App, TFile } from "obsidian";
import type { BeautifulGraphSettings, GraphEdge, GraphModel, GraphNode, GraphPoint } from "./types";
import { effectiveGroup, nodeAllowed } from "./groups";
import { applyDerivedNodePresentation } from "./node-presentation";
import { deriveGraphRelationships } from "./graph-relationships";
import { distributedFamilyAnchors, familySeedPosition, savedFamilyAnchors, savedLayoutStats, type SeedObstacle } from "./layout-persistence";
import { orphanAllowed } from "./presentation";

const CATEGORY = {
  Wiki: ["#44D7B6", "📜"], Raw: ["#FF8A4C", "🧺"], Development: ["#9B87F5", "🛠️"],
  Outputs: ["#66C56C", "📦"], Root: ["#F5B82E", "◆"], Other: ["#454A53", ""],
} as const;

function classify(path: string): keyof typeof CATEGORY {
  if (path.startsWith("wiki/")) return "Wiki";
  if (path.startsWith("raw/")) return "Raw";
  if (path.startsWith("dev/")) return "Development";
  if (path.startsWith("outputs/")) return "Outputs";
  if (!path.includes("/")) return "Root";
  return "Other";
}

function title(file: TFile, replace: boolean, capitalize: boolean): string {
  const value = file.basename === "index" && file.parent?.name ? file.parent.name : file.basename;
  const readable = replace ? value.replaceAll("_", " ") : value;
  return capitalize ? readable.replace(/(^|[ _-])[a-z]/g, (value) => value.toUpperCase()) : readable;
}

export function buildGraphModel(app: App, settings: BeautifulGraphSettings, positions: Record<string, GraphPoint>): GraphModel {
  const files = app.vault.getMarkdownFiles();
  const paths = new Set(files.map((file) => file.path));
  const {points:savedPoints,span:savedSpan,center:savedCenter}=savedLayoutStats(positions,paths);
  const useSavedLayout = savedPoints.length>0 && savedSpan <= 50_000;
  // Preserve the user's settled scale exactly. Camera fitting handles large valid layouts.
  const savedScale = 1;
  const directedLinks:{source:string;target:string}[]=[];
  const degree = new Map<string, number>();
  for (const source of files) {
    const links = app.metadataCache.resolvedLinks[source.path] ?? {};
    for (const target of Object.keys(links)) {
      if(paths.has(target))directedLinks.push({source:source.path,target});
    }
  }
  const relationships=deriveGraphRelationships(paths,directedLinks),edges:GraphEdge[]=relationships.edges;
  for(const edge of edges){degree.set(edge.source,(degree.get(edge.source)??0)+1);degree.set(edge.target,(degree.get(edge.target)??0)+1)}
  const nodes: GraphNode[] = files.map((file, index) => {
    const category = classify(file.path);
    const [color, icon] = CATEGORY[category];
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
    const d = degree.get(file.path) ?? 0;
    const group=effectiveGroup(file.path,settings.groups),hub=d>=12;
    const savedSeed = useSavedLayout ? positions[file.path] : undefined;
    const seed = [...file.path].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
    const angle = (seed / 4294967296) * Math.PI * 2;
    const spread = 80 + Math.sqrt(index + 1) * 4.5;
    const radius = Math.min(24, 3.5 + Math.log2(d + 1) * 2.2) * (hub ? 1.5 : category === "Other" ? 0.55 : 1);
    return {
      id: file.path, path: file.path, label: title(file, settings.replaceUnderscores,settings.capitalizeDirectories), folder: file.parent?.path ?? "",
      family:relationships.familyByNode.get(file.path)??`folder:${file.parent?.path??""}`,
      category, color: group?.color??settings.other.color, icon:String(frontmatter?.graph_icon ?? group?.icon ?? settings.other.icon ?? icon), degree: d,
      baseRadius:radius, radius, description: String(frontmatter?.description ?? ""), visible: nodeAllowed(file.path,settings.groups,settings.other.visible)&&orphanAllowed(d,settings.display.showOrphans), hub,
      alwaysLabel:false,rootIndexStyled:false,
      x: savedSeed ? savedSeed.x*savedScale : savedCenter.x+Math.cos(angle)*spread,
      y: savedSeed ? savedSeed.y*savedScale : savedCenter.y+Math.sin(angle)*spread,
    };
  });
  applyDerivedNodePresentation(nodes,edges,settings);
  if(useSavedLayout){
    const familyAnchors=distributedFamilyAnchors(nodes.map(node=>node.family),savedFamilyAnchors(nodes,positions),savedCenter,savedSpan);
    const familyOrdinals=new Map<string,number>(),familyObstacles=new Map<string,SeedObstacle[]>();
    for(const node of nodes){if(!positions[node.path])continue;const obstacles=familyObstacles.get(node.family)??[];obstacles.push({x:node.x,y:node.y,radius:node.radius*settings.display.nodeSize+2});familyObstacles.set(node.family,obstacles)}
    const unsaved=nodes.filter(node=>!positions[node.path]).sort((a,b)=>a.family.localeCompare(b.family)||b.radius-a.radius||a.path.localeCompare(b.path));
    for(const node of unsaved){
      const ordinal=familyOrdinals.get(node.family)??0,obstacles=familyObstacles.get(node.family)??[],radius=node.radius*settings.display.nodeSize+2;familyOrdinals.set(node.family,ordinal+1);const spacing=Math.max(12,radius+4),seed=familySeedPosition(node.path,ordinal,node.family,familyAnchors,savedCenter,spacing,obstacles,radius);node.x=seed.x;node.y=seed.y;obstacles.push({...seed,radius});familyObstacles.set(node.family,obstacles);
    }
  }
  return { nodes, edges };
}

export const CATEGORY_ORDER = Object.keys(CATEGORY);
