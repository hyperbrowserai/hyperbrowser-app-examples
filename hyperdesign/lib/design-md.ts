import YAML from "yaml";
import type { DesignTokens } from "@/types";

/**
 * Parse YAML frontmatter from a DESIGN.md string and return structured tokens.
 */
export function parseDesignFrontmatter(designMd: string): {
  tokens: DesignTokens | null;
} {
  const trimmed = designMd.trimStart();
  if (!trimmed.startsWith("---")) {
    return { tokens: null };
  }

  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { tokens: null };
  }

  const inner = trimmed.slice(3, end).trim();
  try {
    const parsed = YAML.parse(inner);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { tokens: parsed as DesignTokens };
    }
    return { tokens: null };
  } catch {
    return { tokens: null };
  }
}
