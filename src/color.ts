export function getContrastTextColor(hexColor: string): "#000000" | "#ffffff" {
  const normalized = hexColor.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 150 ? "#000000" : "#ffffff";
}

