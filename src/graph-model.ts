import type { App, TFile } from "obsidian";
import type { BeautifulGraphSettings, GraphEdge, GraphModel, GraphNode } from "./types";
import { effectiveGroup, nodeAllowed } from "./groups";
import { applyDerivedNodePresentation } from "./node-presentation";
import { deriveGraphRelationships } from "./graph-relationships";
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

export function buildGraphModel(app: App, settings: BeautifulGraphSettings): GraphModel {
  const files = app.vault.getMarkdownFiles();
  const paths = new Set(files.map((file) => file.path));
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
  const nodes: GraphNode[] = files.map((file) => {
    const category = classify(file.path);
    const [color, icon] = CATEGORY[category];
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
    const d = degree.get(file.path) ?? 0;
    const group=effectiveGroup(file.path,settings.groups),hub=d>=12;
    const radius = Math.min(24, 3.5 + Math.log2(d + 1) * 2.2) * (hub ? 1.5 : category === "Other" ? 0.55 : 1);
    return {
      id: file.path, path: file.path, label: title(file, settings.replaceUnderscores,settings.capitalizeDirectories), folder: file.parent?.path ?? "",
      family:relationships.familyByNode.get(file.path)??`folder:${file.parent?.path??""}`,
      category, color: group?.color??settings.other.color, icon:String(frontmatter?.graph_icon ?? group?.icon ?? settings.other.icon ?? icon), degree: d,
      baseRadius:radius, radius, description: String(frontmatter?.description ?? ""), visible: nodeAllowed(file.path,settings.groups,settings.other.visible)&&orphanAllowed(d,settings.display.showOrphans), hub,
      alwaysLabel:false,rootIndexStyled:false,
      x:0,y:0,
    };
  });
  applyDerivedNodePresentation(nodes,edges,settings);
  return { nodes, edges };
}

export const CATEGORY_ORDER = Object.keys(CATEGORY);
