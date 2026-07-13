import type { BeautifulGraphSettings, GraphEdge, GraphGroup, GraphNode } from "./types";

type PresentationSettings = Pick<BeautifulGraphSettings, "groups" | "other" | "rootIndex">;

function groupFor(path:string,groups:GraphGroup[]):GraphGroup|undefined {
  return groups.filter((group)=>path===group.root||path.startsWith(`${group.root}/`)).sort((a,b)=>b.root.length-a.root.length||a.order-b.order)[0];
}

export function activeNodeIds(nodes: GraphNode[]): Set<string> {
  return new Set(nodes.filter((node) => node.visible).map((node) => node.id));
}

export function sameNodeIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

export function applyDerivedNodePresentation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  settings: PresentationSettings,
): number {
  const ordinaryMax = Math.max(3.5, ...nodes.map((node) => node.baseRadius));
  const rootPath = nodes.some((node) => node.path === "index.md") ? "index.md" : undefined;
  const rootStyled = new Set<string>();
  if (settings.rootIndex.enabled && rootPath) {
    rootStyled.add(rootPath);
    if (settings.rootIndex.includeLinked) {
      for (const edge of edges) {
        if (edge.source === rootPath) rootStyled.add(edge.target);
        else if (edge.target === rootPath) rootStyled.add(edge.source);
      }
    }
  }

  for (const node of nodes) {
    const group = groupFor(node.path, settings.groups);
    const isRoot = node.path === rootPath;
    const isGroupIndex = !!group && node.path === `${group.root}/index.md`;
    node.alwaysLabel = isRoot || isGroupIndex;
    node.rootIndexStyled = rootStyled.has(node.path);
    node.color = node.rootIndexStyled ? settings.rootIndex.color : (group?.color ?? settings.other.color);
    node.icon = node.rootIndexStyled ? settings.rootIndex.icon : (group?.icon ?? settings.other.icon);
    node.radius = isRoot ? ordinaryMax * 1.5 : isGroupIndex ? ordinaryMax : node.baseRadius;
  }
  return ordinaryMax;
}
