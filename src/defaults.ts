import type { GraphDisplay, GraphForces } from "./types";

export const DEFAULT_FORCES: GraphForces = {
  center: 0.51876,
  repel: 0.3084,
  link: 0.054,
  distance: 247,
  curvature: 0,
  stretchiness: 0.04,
  siblingLinkForce: true,
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 22.014,
  nodeSize: 1.66074,
  linkThickness: 1.6444400000000003,
  glow: 0.679144,
  glowSize: 1.3,
  showSiblingLinks: true,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.71,
  recenterOnFocus: false,
};
