export interface GraphForces { center: number; repel: number; link: number; distance: number; curvature: number; siblingLinkForce: number; rootLinkForce:number }
export interface GraphDisplay { arrows: boolean; textFade: number; nodeSize: number; linkThickness: number; glow: number; glowSize: number; showSiblingLinks: boolean; showOrphans:boolean; showLinkedInSearch: boolean; lensOpacity: number; lensRadius: number; recenterOnFocus:boolean }
export interface PanelPixelGeometry { x?:number; y?:number; width?:number; height?:number }
/** Panel geometry is stored as a 0..1 fraction of the graph leaf. */
export interface PanelState { visible:boolean; collapsed:boolean; pinned?:boolean; autoHeight?:boolean; x?:number; y?:number; width?:number; height?:number; z?:number; legacyPixels?:PanelPixelGeometry }
export interface GraphGroup { id:string; root:string; color:string; icon:string; visible:boolean; origin:"auto"|"manual"; order:number; stale?:boolean }
export interface FallbackGroupStyle { visible:boolean; color:string; icon:string; colorMode:"palette"|"custom" }
export interface RootIndexStyle { enabled:boolean; color:string; icon:string; includeLinked:boolean }
export interface GroupsPreset { groups:GraphGroup[]; other:FallbackGroupStyle; rootIndex:RootIndexStyle; paletteId:string; lensOpacity:number; lensRadius:number }
export interface BeautifulGraphSettings {
  replaceUnderscores: boolean;
  capitalizeDirectories: boolean;
  maxLabelDirectories: number;
  forces: GraphForces;
  display: GraphDisplay;
  categoryVisibility: Record<string, boolean>;
  groups: GraphGroup[];
  other:FallbackGroupStyle;
  rootIndex:RootIndexStyle;
  /** Runtime migration alias; kept synchronized with other.visible. */
  otherVisible:boolean;
  groupPalette:string;
  groupPresets:Record<string,GroupsPreset>;
  panels: Record<string, PanelState>;
  forcePresets: Record<string, GraphForces>;
  displayPresets: Record<string, GraphDisplay>;
  historyLimit: number;
  savedNodeCount:number;
}
export interface GraphPoint { x: number; y: number }
export interface BeautifulGraphData { version: number; layoutRevision:number; settings: BeautifulGraphSettings; positions: Record<string, GraphPoint> }
export interface GraphNode extends GraphPoint {
  id: string; path: string; label: string; folder: string; category: string; color: string; icon: string;
  degree: number; readonly baseRadius: number; radius: number; description: string; visible: boolean; hub: boolean; alwaysLabel:boolean; rootIndexStyled:boolean;
  family:string;
}
export type GraphRelationship="parent"|"sibling"|"cross";
export interface GraphEdge { source:string; target:string; forward:boolean; reverse:boolean; relationship:GraphRelationship }
export interface GraphModel { nodes: GraphNode[]; edges: GraphEdge[] }
