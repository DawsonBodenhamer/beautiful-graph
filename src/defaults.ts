import type { GraphDisplay, GraphForces } from "./types";

export const DEFAULT_FORCES: GraphForces = {
  center: 0.5187132489703118,
  repel: 10,
  link: 1,
  distance: 250,
  curvature: 0,
  siblingLinkForce: 15,
  rootLinkForce: 1,
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 24.748992,
  nodeSize: 2.8660740000000002,
  linkThickness: 1.2583300000000004,
  glow: 0.679144,
  glowSize: 1.3,
  showSiblingLinks: false,
  showOrphans: true,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.74,
  recenterOnFocus: false,
};
