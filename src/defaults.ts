import type { GraphDisplay, GraphForces } from "./types";

export const DEFAULT_FORCES: GraphForces = {
  center: 1.2358954399999997,
  repel: 1,
  link: 0.041472,
  distance: 362.874,
  curvature: 0,
  stretchiness: 0.08224000000000006,
  siblingLinkForce: 1,
};

export const DEFAULT_DISPLAY: GraphDisplay = {
  arrows: false,
  textFade: 24.748992,
  nodeSize: 2.8660740000000002,
  linkThickness: 1.2583300000000004,
  glow: 0.679144,
  glowSize: 1.3,
  showSiblingLinks: false,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.74,
  recenterOnFocus: false,
  iconMode:"color",
};
