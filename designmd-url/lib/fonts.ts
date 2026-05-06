/** Return the leading font token if it matches Google Fonts style names. */
export function firstFontFamilyToken(raw?: string | null): string | null {
  if (!raw) return null;
  const token =
    raw
      .split(",")[0]
      ?.trim()
      .replace(/^["'`]+/, "")
      .replace(/["'`]+$/, "")
      .trim() ?? "";
  if (!token) return null;
  if (!/^[a-zA-Z0-9 \-]+$/.test(token)) return null;
  return token;
}

export function buildGoogleFontsHref(families: (string | undefined | null)[]): string | null {
  const unique = new Set<string>();
  for (const f of families) {
    const t = firstFontFamilyToken(f);
    if (t) unique.add(t);
  }
  if (!unique.size) return null;
  const q = [...unique]
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}
