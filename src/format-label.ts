export function formatGraphLabel(
  path: string,
  replaceUnderscores: boolean,
  maxDirectories = Number.POSITIVE_INFINITY,
): string {
  const normalized = path.replace(/\\/g, "/");
  const isIndex = /(^|\/)index\.md$/i.test(normalized);
  let parts = normalized.split("/").filter(Boolean);

  if (isIndex) {
    parts = parts.slice(0, -1);
  } else {
    const filename = parts.at(-1) ?? normalized;
    parts = [filename.replace(/\.md$/i, "")];
  }

  if (replaceUnderscores) {
    parts = parts.map((part) => part.replace(/_/g, " "));
  }

  if (isIndex && parts.length > maxDirectories && maxDirectories >= 3) {
    const retained = maxDirectories - 1;
    const leadingCount = Math.ceil(retained / 2);
    const trailingCount = Math.floor(retained / 2);
    parts = [
      ...parts.slice(0, leadingCount),
      "...",
      ...parts.slice(parts.length - trailingCount),
    ];
  }

  return parts.join(" > ") || "index";
}

export function formatTooltipPath(path: string, maxCharacters = 86): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean).map((part) =>
    part.replace(/_/g, " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase()),
  );
  const full = parts.join(" > ");
  if (full.length <= maxCharacters || parts.length < 3) return full;
  const kept = [parts[0]!, "...", parts.at(-1)!];
  let left = 1;
  let right = parts.length - 2;
  while (left <= right) {
    const nextLeft = [...kept.slice(0, -2), parts[left]!, ...kept.slice(-2)];
    if (nextLeft.join(" > ").length <= maxCharacters) {
      kept.splice(kept.length - 2, 0, parts[left++]!);
    } else break;
    if (left > right) break;
    const nextRight = [...kept.slice(0, -1), parts[right]!, kept.at(-1)!];
    if (nextRight.join(" > ").length <= maxCharacters) {
      kept.splice(kept.length - 1, 0, parts[right--]!);
    } else break;
  }
  return kept.join(" > ");
}
