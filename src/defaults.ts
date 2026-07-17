import type { GraphDisplay, GraphForces } from "./types";

export const DEFAULT_FORCES: GraphForces = {
  center: 0.5187132489703118,
  repel: 10,
  link: 1,
  distance: 250,
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 24.7,
  nodeSize: 4,
  linkThickness: 1.3,
  glow: 0.45,
  glowSize: 1.5,
  showSiblingLinks: false,
  showOrphans: true,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.74,
  recenterOnFocus: false,
};
