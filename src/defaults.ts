import type { GraphAmbience, GraphDisplay, GraphForces } from "./types";

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
  recenterMultiplier: 1.25,
  showSiblingLinks: false,
  showOrphans: true,
  showLinkedInSearch: false,
  lensOpacity: 0.26,
  lensRadius: 1.74,
  recenterOnFocus: false,
};

export const DEFAULT_AMBIENCE:GraphAmbience={
  vignette:.43,
  brightness:1,
  hue:0,
  saturation:1,
  speed:.35,
  count:120,
  irregularity:.6,
  particleSize:1,
  dustFade:.35,
  dustBoost:.65,
};
