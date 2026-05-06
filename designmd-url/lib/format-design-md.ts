import type { BrandingFont, BrandingProfile, BrandingTypography } from "@/types";

const COLOR_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  background: "Background",
  textPrimary: "Text (primary)",
  textSecondary: "Text (secondary)",
  link: "Link",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

export function hostnameFromUrl(url: string): string {
  const normalized = url.trim();
  try {
    const full =
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalized}`;
    return new URL(full).hostname.replace(/^www\./i, "");
  } catch {
    return normalized.replace(/^https?:\/\//i, "").split("/")[0] ?? normalized;
  }
}

function metaPick(meta: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  const v = meta[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
  return undefined;
}

export function pickBrandDisplayName(
  metadata: Record<string, unknown> | undefined,
  url: string,
): string {
  return (
    metaPick(metadata, "title") ??
    metaPick(metadata, "og:title") ??
    metaPick(metadata, "ogTitle") ??
    hostnameFromUrl(url)
  );
}

export function normalizeTargetUrl(input: string): string {
  const t = input.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function yamlQuote(input: string): string {
  return `"${input.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function pickHeadingFamily(b: BrandingProfile): string | undefined {
  const tf = b.typography?.fontFamilies?.heading ?? b.typography?.fontFamilies?.primary;
  if (tf) return tf;
  const tagged = b.fonts?.find((f: BrandingFont) => f.role === "heading" || f.role === "display");
  return tagged?.family ?? b.fonts?.[0]?.family;
}

function pickBodyFamily(b: BrandingProfile): string | undefined {
  const tf = b.typography?.fontFamilies?.primary ?? b.typography?.fontFamilies?.heading;
  if (tf) return tf;
  const tagged = b.fonts?.find((f: BrandingFont) => f.role === "body");
  return (
    tagged?.family ??
    b.fonts?.find((f: BrandingFont) => !f.role || f.role === "unknown")?.family ??
    b.fonts?.[0]?.family
  );
}

export function formatDesignMd(
  branding: BrandingProfile,
  url: string,
  metadata?: Record<string, unknown>,
): string {
  const name = pickBrandDisplayName(metadata, url);
  const host = hostnameFromUrl(url);

  const lines: string[] = ["---"];

  lines.push(`name: ${yamlQuote(name)}`);

  const colors = branding.colors;
  if (colors && Object.entries(colors).some(([, raw]) => raw != null && String(raw).trim() !== "")) {
    lines.push("colors:");
    for (const [key, raw] of Object.entries(colors)) {
      if (raw == null || String(raw).trim() === "") continue;
      lines.push(`  ${key}: ${yamlQuote(String(raw).trim())}`);
    }
  }

  const headingFf = pickHeadingFamily(branding);
  const bodyFf = pickBodyFamily(branding);

  if (headingFf || bodyFf) {
    lines.push("typography:");
    if (headingFf) {
      lines.push(`  heading:`);
      lines.push(`    fontFamily: ${yamlQuote(headingFf)}`);
    }
    if (bodyFf) {
      lines.push(`  body:`);
      lines.push(`    fontFamily: ${yamlQuote(bodyFf)}`);
    }
  }

  lines.push("---", "", "## Overview", "");

  const tone = branding.personality?.tone;
  const opener = `${name} design system extracted from ${host}.`;
  const toneSentence = tone ? ` Tone: ${tone}.` : "";
  const desc =
    metaPick(metadata, "description") ??
    metaPick(metadata, "og:description") ??
    metaPick(metadata, "ogDescription");

  lines.push(`${opener}${toneSentence}`, "");
  if (desc) lines.push(desc, "");

  if (colors && Object.entries(colors).some(([, v]) => v != null && String(v).trim())) {
    lines.push("## Colors", "");
    for (const [key, raw] of Object.entries(colors)) {
      if (raw == null || String(raw).trim() === "") continue;
      const label = COLOR_LABELS[key] ?? key;
      lines.push(`- **${label}** (\`${key}\`): ${String(raw)}`);
    }
    lines.push("");
  }

  const typographyLines: string[] = [];
  if (headingFf || bodyFf) {
    typographyLines.push(
      "### Font roles",
      "",
      ...(headingFf ? [`- Heading: ${headingFf}`] : []),
      ...(bodyFf ? [`- Body: ${bodyFf}`] : []),
      "",
    );
  }
  const sizes = branding.typography?.fontSizes;
  if (sizes && Object.keys(sizes).length > 0) {
    typographyLines.push("### Sizes", "", ...describeFontSizes(sizes), "");
  }
  const weights = branding.typography?.fontWeights;
  if (weights && Object.keys(weights).length > 0) {
    typographyLines.push("### Weights", "", ...describeWeights(weights), "");
  }
  if (branding.fonts && branding.fonts.length > 0) {
    const fonts: BrandingFont[] = branding.fonts;
    typographyLines.push("### Detected font usage", "");
    typographyLines.push("| Role | Family |", "|------|--------|");
    for (const f of fonts) {
      typographyLines.push(`| ${f.role ?? "unknown"} | ${f.family ?? "unknown"} |`);
    }
    typographyLines.push("");
  }

  const families = branding.typography?.fontFamilies;
  if (families && Object.keys(families).length > 0) {
    typographyLines.push(
      "### Typography.fontFamilies",
      "",
      ...Object.entries(families)
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([k, v]) => `- **${k}**: ${v}`),
      "",
    );
  }

  if (typographyLines.length > 0) {
    lines.push("## Typography", "");
    lines.push(...typographyLines);
  }

  lines.push("## Brand Identity", "");

  if (branding.images?.logo) {
    lines.push(`Logo: ${branding.images.logo}`, "");
  }
  if (branding.images?.favicon) {
    lines.push(`Favicon: ${branding.images.favicon}`, "");
  }
  if (branding.images?.ogImage) {
    lines.push(`Open Graph image: ${branding.images.ogImage}`, "");
  }

  if (tone) {
    lines.push(`Tone: ${tone}`, "");
  }
  const energy = branding.personality?.energy;
  if (energy) {
    lines.push(`Energy: ${energy}`, "");
  }
  const audience = branding.personality?.targetAudience;
  if (audience) {
    lines.push(`Target audience: ${audience}`, "");
  }

  const styleHint = (branding.personality as { style?: string } | undefined)?.style;
  if (styleHint) {
    lines.push(`Style: ${styleHint}`, "");
  }

  const framework = branding.designSystem?.framework;
  const componentLibrary = branding.designSystem?.componentLibrary;
  if (framework && framework !== "unknown") {
    lines.push(`Design framework: ${framework}`, "");
  }
  if (componentLibrary) {
    lines.push(`Component library: ${componentLibrary}`, "");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function describeFontSizes(sizes: NonNullable<BrandingTypography["fontSizes"]>): string[] {
  return Object.entries(sizes)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`);
}

function describeWeights(weights: NonNullable<BrandingTypography["fontWeights"]>): string[] {
  return Object.entries(weights)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `- ${k}: ${v}`);
}
