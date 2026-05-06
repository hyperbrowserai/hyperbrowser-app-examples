"use client";

import type { BrandingFont, BrandingProfile } from "@/types";
import { pickBrandDisplayName } from "@/lib/format-design-md";
import { useGoogleFontsInjection } from "@/lib/use-google-fonts";
import { BadgeInfo, Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

function pickHeadingStack(b: BrandingProfile): string | undefined {
  const stack = b.typography?.fontStacks?.heading ?? b.typography?.fontStacks?.body;
  const joined = stack?.filter(Boolean).join(", ");
  if (joined) return joined;
  const fam = b.typography?.fontFamilies?.heading ?? b.typography?.fontFamilies?.primary;
  if (fam) return fam;
  const font =
    b.fonts?.find((f: BrandingFont) => f.role === "heading" || f.role === "display") ?? b.fonts?.[0];
  return font?.family;
}

function pickBodyStack(b: BrandingProfile): string | undefined {
  const stack = b.typography?.fontStacks?.body ?? b.typography?.fontStacks?.paragraph;
  const joined = stack?.filter(Boolean).join(", ");
  if (joined) return joined;
  const fam = b.typography?.fontFamilies?.primary ?? b.typography?.fontFamilies?.heading;
  if (fam) return fam;
  const font =
    b.fonts?.find((f: BrandingFont) => f.role === "body") ?? b.fonts?.[1] ?? b.fonts?.[0];
  return font?.family;
}

interface DesignPreviewProps {
  branding: BrandingProfile;
  metadata?: Record<string, unknown> | null;
  sourceUrl: string;
}

export function DesignPreview({ branding, metadata, sourceUrl }: DesignPreviewProps) {
  const name = pickBrandDisplayName(metadata ?? undefined, sourceUrl);
  const headingStack = pickHeadingStack(branding);
  const bodyStack = pickBodyStack(branding);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const familiesForInjection = useMemo(
    () => [headingStack ?? undefined, bodyStack ?? undefined],
    [headingStack, bodyStack],
  );
  useGoogleFontsInjection(familiesForInjection);

  const colorPairs = useMemo(() => {
    const raw = branding.colors;
    if (!raw) return [];
    return Object.entries(raw).filter(([, v]) => v != null && String(v).trim() !== "");
  }, [branding.colors]);

  const copyColor = async (id: string, value: string) => {
    const text = String(value).trim();
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
  };

  const logo = branding.images?.logo ?? undefined;
  const tone = branding.personality?.tone;
  const energy = branding.personality?.energy;

  const confidence = branding.confidence?.overall;

  return (
    <div className="flex h-full flex-col gap-8 border-4 border-black bg-white p-6 shadow-brutal">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-500">Preview</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-black">{name}</h2>
          {typeof confidence === "number" && confidence < 0.55 ? (
            <p className="mt-2 max-w-md text-[10px] font-bold uppercase leading-snug tracking-wide text-gray-600">
              Automated extraction — colors may match generic anchors (e.g. link blue) when the model is
              uncertain. Compare with the live site.
            </p>
          ) : null}
          {(tone || energy) && (
            <div className="mt-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-black">
              <BadgeInfo size={14} strokeWidth={2.5} aria-hidden />
              <span>
                {tone}
                {tone && energy ? " · " : ""}
                {energy}
              </span>
            </div>
          )}
        </div>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote arbitrary brand assets
          <img
            src={logo}
            alt={branding.images?.logoAlt ?? `${name} logo`}
            className="max-h-16 max-w-[200px] border-2 border-black bg-white object-contain p-2"
          />
        ) : null}
      </div>

      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-gray-500">Colors</h3>
        {colorPairs.length === 0 ? (
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">No palette returned</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {colorPairs.map(([key, hex]) => {
              const val = String(hex);
              const id = `${key}-${val}`;
              const isCopied = copiedId === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-label={`Copy color ${key}: ${val}`}
                    onClick={() => void copyColor(id, val)}
                    className="group flex w-full flex-col gap-2 border-4 border-black bg-white p-2.5 text-left shadow-brutal-sm outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    <span
                      className="aspect-square w-full shrink-0 border-2 border-black"
                      style={{ backgroundColor: val }}
                      aria-hidden
                    />
                    <span className="flex w-full flex-col items-center pt-1">
                      <span className="w-full truncate text-center text-[10px] font-black uppercase tracking-wider text-gray-500">
                        {key}
                      </span>
                      <span className="mt-0.5 flex w-full items-center justify-center gap-1.5 font-mono text-[11px] font-bold tracking-tight text-black">
                        <span className="truncate">{val}</span>
                        {isCopied ? (
                          <Check className="h-3 w-3 shrink-0 text-black" aria-hidden strokeWidth={3} />
                        ) : (
                          <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden strokeWidth={3} />
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-gray-500">Typography</h3>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">Heading sample</p>
            <p
              className="text-3xl font-semibold leading-snug text-black"
              style={{ fontFamily: headingStack ?? "ui-sans-serif, system-ui" }}
            >
              The quick brown fox
            </p>
            {headingStack ? (
              <p className="mt-2 break-words font-mono text-[10px] uppercase tracking-wide text-gray-500">
                {headingStack}
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">Body sample</p>
            <p
              className="text-base leading-relaxed text-gray-800"
              style={{ fontFamily: bodyStack ?? "ui-sans-serif, system-ui" }}
            >
              Design systems keep product experiences consistent. Typography, color, spacing, and imagery work
              together across every surface customers touch.
            </p>
            {bodyStack ? (
              <p className="mt-2 break-words font-mono text-[10px] uppercase tracking-wide text-gray-500">
                {bodyStack}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
