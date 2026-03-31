/** Slug folder name for skill files (matches server generator). */
export function slugifyTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Path for a child file under a parent markdown path. */
export function childFilePath(parentFilePath: string, childId: string): string {
  const base = parentFilePath.replace(/\.md$/i, "");
  return `${base}/${childId}.md`;
}
