import type { GraphDisplay, GraphForces } from "./types";

export const DEFAULT_FORCES: GraphForces = {
  center: 1.98,
  repel: 0.24,
  link: 0.058,
  distance: 213,
  curvature: 0.23,
  stretchiness: 0,
  siblingLinkForce: true,
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 21,
  nodeSize: 0.79,
  linkThickness: 0.79,
  glow: 0.679144,
  glowSize: 1.3,
  showSiblingLinks: true,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.71,
  recenterOnFocus: false,
};
