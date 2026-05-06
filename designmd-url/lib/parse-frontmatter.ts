/**
 * Split DESIGN.md YAML frontmatter from the Markdown body when present.
 */
export function splitFrontmatter(markdown: string): { yaml: string; body: string } | null {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith("---\n") && !trimmed.startsWith("---\r\n")) return null;

  let rest = trimmed.slice(4);
  if (trimmed.startsWith("---\r\n")) rest = trimmed.slice(5);

  const end = /\r?\n---\r?\n/;
  const match = rest.match(end);
  if (!match || match.index == null) return null;

  const yaml = rest.slice(0, match.index);
  const body = rest.slice(match.index + match[0].length);
  return { yaml, body };
}

/**
 * Read the `name` field from DESIGN.md YAML frontmatter.
 */
export function parseFrontmatterName(markdown: string): string | null {
  const parts = splitFrontmatter(markdown);
  if (!parts) return null;
  for (const line of parts.yaml.split(/\r?\n/)) {
    const m = line.match(/^name:\s*(.+)$/);
    if (!m) continue;
    const raw = m[1]?.trim();
    if (!raw) continue;
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1).replace(/\\"/g, '"');
    }
    return raw;
  }
  return null;
}
