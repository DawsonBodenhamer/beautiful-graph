/** Tests a node pointer in the sprite texture's local coordinate space. */
export function textureCircleContains(
  x: number,
  y: number,
  textureWidth: number,
  textureHeight: number,
): boolean {
  const radius = Math.min(textureWidth, textureHeight) / 2;
  return Number.isFinite(radius) && radius > 0 && Math.hypot(x, y) <= radius;
}
