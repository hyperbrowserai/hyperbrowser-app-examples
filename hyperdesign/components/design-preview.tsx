"use client";

import type { DesignTokens, PageCopy } from "@/types";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Palette, Type, LayoutGrid, CircleDot, Camera, Check, Copy } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/* ── Toast ──────────────────────────────────────────────────── */
interface Toast {
  id: number;
  label: string;
  value: string;
  color?: string;
}

let _toastId = 0;

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col-reverse gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2.5 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 border-2 border-black shadow-brutal-sm animate-fade-in-up"
        >
          {t.color && (
            <span
              className="w-3.5 h-3.5 shrink-0 border border-white/30 inline-block"
              style={{ backgroundColor: t.color }}
            />
          )}
          <Check size={12} strokeWidth={3} className="shrink-0" />
          <span>{t.label}</span>
          <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">{t.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Copy hook (with toast) ─────────────────────────────────── */
function useCopyWithToast(addToast: (label: string, value: string, color?: string) => void) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, label = "Copied", color?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      addToast(label, text, color);
      setTimeout(() => setCopied(null), 1800);
    });
  }, [addToast]);
  return { copied, copy };
}

/* Legacy inline button — used for typography */
function CopyButton({ value, label, addToast, className = "" }: {
  value: string;
  label?: string;
  addToast: (label: string, value: string, color?: string) => void;
  className?: string;
}) {
  const { copied, copy } = useCopyWithToast(addToast);
  const isCopied = copied === value;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); copy(value, label ?? "Copied"); }}
      title={`Copy ${value}`}
      className={`shrink-0 flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 transition-all
        ${isCopied
          ? "border-black bg-black text-white"
          : "border-gray-300 bg-white text-gray-500 hover:border-black hover:text-black"}
        ${className}`}
    >
      {isCopied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} strokeWidth={2.5} />}
      {isCopied ? "Copied" : "Copy"}
    </button>
  );
}

interface DesignPreviewProps {
  tokens: DesignTokens | null;
  screenshotDataUrl: string;
  fullPageDataUrl?: string;
  pageCopy?: PageCopy | null;
}

function toHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) return s;
  if (/^rgb(a)?\(/i.test(s)) return s;
  return null;
}

function flattenColors(
  colors: Record<string, unknown> | undefined,
  prefix = ""
): { key: string; value: string }[] {
  if (!colors) return [];
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(colors)) {
    const label = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenColors(v as Record<string, unknown>, label));
      continue;
    }
    const hex = toHexColor(v);
    if (hex) out.push({ key: label, value: hex });
  }
  return out;
}

function typographyEntries(
  typography: Record<string, unknown> | undefined
): { name: string; spec: Record<string, unknown> }[] {
  if (!typography) return [];
  return Object.entries(typography)
    .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
    .map(([name, spec]) => ({ name, spec: spec as Record<string, unknown> }));
}

function firstFontFamily(spec: Record<string, unknown>): string {
  const raw =
    spec.fontFamily ?? spec.font_family ?? spec["font-family"];
  if (typeof raw !== "string") return "inherit";
  const first = raw.split(",")[0].trim().replace(/['"]/g, "");
  return first || "inherit";
}

function specToCss(spec: Record<string, unknown>): React.CSSProperties {
  const ff = firstFontFamily(spec);
  const fontSize =
    typeof spec.fontSize === "string"
      ? spec.fontSize
      : typeof spec.font_size === "string"
        ? spec.font_size
        : undefined;
  const fontWeight =
    typeof spec.fontWeight === "string" || typeof spec.fontWeight === "number"
      ? spec.fontWeight
      : typeof spec.font_weight === "string" ||
          typeof spec.font_weight === "number"
        ? spec.font_weight
        : undefined;
  const lineHeight =
    typeof spec.lineHeight === "string" ||
    typeof spec.lineHeight === "number"
      ? spec.lineHeight
      : typeof spec.line_height === "string" ||
          typeof spec.line_height === "number"
        ? spec.line_height
        : undefined;
  const letterSpacing =
    typeof spec.letterSpacing === "string"
      ? spec.letterSpacing
      : typeof spec.letter_spacing === "string"
        ? spec.letter_spacing
        : undefined;

  return {
    fontFamily: ff.includes(" ") ? `"${ff}", sans-serif` : `${ff}, sans-serif`,
    fontSize: fontSize as string | undefined,
    fontWeight: fontWeight as React.CSSProperties["fontWeight"],
    lineHeight: lineHeight as React.CSSProperties["lineHeight"],
    letterSpacing: letterSpacing as string | undefined,
  };
}

const GENERIC_FONTS = new Set([
  "inherit",
  "sans-serif",
  "serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
]);

function googleFontsHref(families: string[]): string | null {
  const cleaned = [
    ...new Set(
      families
        .map((f) => f.trim())
        .filter(
          (f) =>
            f &&
            !GENERIC_FONTS.has(f.toLowerCase()) &&
            !f.toLowerCase().includes("apple")
        )
    ),
  ];
  if (cleaned.length === 0) return null;
  const q = cleaned
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

function scaleBlocks(
  data: Record<string, unknown> | undefined
): { key: string; px: number }[] {
  if (!data) return [];
  return Object.entries(data)
    .map(([key, val]) => {
      let n = 0;
      if (typeof val === "number") n = val;
      else if (typeof val === "string") {
        const m = val.match(/^(\d+(?:\.\d+)?)\s*px$/i);
        if (m) n = parseFloat(m[1]);
      }
      return { key, px: n };
    })
    .filter((x) => x.px > 0);
}

const CROPS: { label: string; origin: string }[] = [
  { label: "Top left",     origin: "0% 0%" },
  { label: "Top right",    origin: "100% 0%" },
  { label: "Bottom left",  origin: "0% 100%" },
  { label: "Bottom right", origin: "100% 100%" },
];

export default function DesignPreview({
  tokens,
  screenshotDataUrl,
  fullPageDataUrl,
  isStreaming,
  pageCopy,
}: DesignPreviewProps & { isStreaming?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((label: string, value: string, color?: string) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, label, value, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  }, []);

  useGSAP(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  useGSAP(() => {
    if (!isStreaming && tokens) {
      gsap.fromTo(
        ".token-section",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [isStreaming, tokens]);
  const colorList = useMemo(
    () => flattenColors(tokens?.colors as Record<string, unknown> | undefined),
    [tokens]
  );

  const typoList = useMemo(
    () =>
      typographyEntries(
        tokens?.typography as Record<string, unknown> | undefined
      ),
    [tokens]
  );

  const fontFamilies = useMemo(() => {
    return typoList.map((t) => firstFontFamily(t.spec)).filter((f) => f !== "inherit");
  }, [typoList]);

  useEffect(() => {
    const href = googleFontsHref(fontFamilies);
    if (!href) return;
    const id = "hyperdesign-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [fontFamilies]);

  const spacingBlocks = useMemo(
    () => scaleBlocks(tokens?.spacing as Record<string, unknown> | undefined),
    [tokens]
  );

  const radiusBlocks = useMemo(
    () => scaleBlocks(tokens?.rounded as Record<string, unknown> | undefined),
    [tokens]
  );

  const maxSpace = Math.max(0, ...spacingBlocks.map((s) => s.px), 1);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-8 border-4 border-black bg-white shadow-brutal p-6 min-h-[560px] overflow-y-auto">
      <ToastStack toasts={toasts} />
      {/* Screenshot gallery */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black text-black">
          <div className="flex items-center gap-2">
            <Camera size={18} strokeWidth={2.5} />
            <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
              Viewport capture
            </h3>
          </div>
          {!isStreaming && (
            <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">
              {CROPS.length} views
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {CROPS.map(({ label, origin }) => (
            <button
              key={label}
              type="button"
              onClick={() => setLightboxOpen(true)}
              title={`${label} — click to expand`}
              className="group relative border-2 border-black overflow-hidden shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5 transition-all bg-gray-50 aspect-video focus:outline-none"
            >
              {isStreaming ? (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              ) : (
                <>
                  <img
                    src={screenshotDataUrl}
                    alt={`${label} view`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
                    style={{
                      transform: "scale(2)",
                      transformOrigin: origin,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                  <span className="absolute bottom-1 left-1 font-mono text-[9px] font-bold uppercase text-white bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {label}
                  </span>
                </>
              )}
            </button>
          ))}

          {/* Expand / + tile */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="View full screenshot"
            className="col-span-4 mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-black py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-all"
          >
            <span className="text-lg leading-none font-black">+</span>
            View full page
          </button>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center p-8 overflow-y-auto"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-6xl w-full border-4 border-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 z-10 bg-white text-black font-bold font-mono text-xs px-3 py-1.5 uppercase tracking-wider hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              Close ✕
            </button>
            <img
              src={fullPageDataUrl || screenshotDataUrl}
              alt="Full page view"
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {isStreaming ? (
        <div className="border-4 border-black bg-gray-50 p-12 flex flex-col items-center justify-center text-center shadow-brutal-sm mt-4">
           <div className="font-mono font-bold uppercase tracking-widest text-gray-500 mb-4">Extracting Design Tokens</div>
           <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tokens?.name && (
            <div className="bg-black text-white px-4 py-2 font-mono font-bold uppercase tracking-widest text-center shadow-brutal-sm border-2 border-black">
              {String(tokens.name)}
            </div>
          )}

          <section className="token-section">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-black text-black">
              <Palette size={18} strokeWidth={2.5} />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                Colors
              </h3>
            </div>
            {colorList.length === 0 ? (
              <p className="text-sm text-gray-500 font-mono italic">
                No color tokens in frontmatter yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {colorList.map(({ key, value }) => (
                  <div
                    key={key}
                    className="group flex flex-col border-2 border-black bg-white shadow-brutal-sm overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-brutal transition-all"
                    onClick={() => { navigator.clipboard.writeText(value); addToast(key, value, value); }}
                    title={`Click to copy ${value}`}
                  >
                    <div
                      className="h-20 w-full border-b-2 border-black relative"
                      style={{ backgroundColor: value }}
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Copy size={16} strokeWidth={2.5} className="text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-[10px] font-bold uppercase text-gray-500 truncate mb-1">
                        {key}
                      </div>
                      <div className="font-mono text-xs font-bold text-black truncate">
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="token-section">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-black text-black">
              <Type size={18} strokeWidth={2.5} />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                Typography
              </h3>
            </div>
            {typoList.length === 0 ? (
              <p className="text-sm text-gray-500 font-mono italic">
                No typography tokens in frontmatter yet.
              </p>
            ) : (
              <div className="space-y-6">
                {typoList.map(({ name, spec }) => {
                  const style = specToCss(spec);
                  const family = firstFontFamily(spec);
                  const copyValue = `${family}, ${String(spec.fontWeight || "400")}, ${String(spec.fontSize || "1rem")}`;
                  const isHeading =
                    name.toLowerCase().includes("h1") ||
                    name.toLowerCase().includes("display") ||
                    name.toLowerCase().includes("title") ||
                    name.toLowerCase().includes("heading");
                  const sampleText = isHeading
                    ? (pageCopy?.heading || "The quick brown fox jumps")
                    : (pageCopy?.body || "Body copy for reading comfort and visual hierarchy.");
                  return (
                    <div
                      key={name}
                      className="border-l-4 border-black pl-4 py-1"
                    >
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div className="font-mono text-xs font-bold uppercase text-black bg-gray-100 px-2 py-0.5 border border-gray-300">
                          {name}
                        </div>
                        <div className="font-mono text-sm text-gray-600 hidden sm:flex flex-1 items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-black">{family}</span>
                          <span className="text-gray-400">•</span>
                          <span>{String(spec.fontWeight || "400")}</span>
                          <span className="text-gray-400">•</span>
                          <span>{String(spec.fontSize || "1rem")}</span>
                        </div>
                        <CopyButton value={copyValue} label="Font copied" addToast={addToast} />
                      </div>
                      <div style={style} className="text-black break-words">
                        {sampleText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="token-section">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-black text-black">
              <LayoutGrid size={18} strokeWidth={2.5} />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                Spacing &amp; radius
              </h3>
            </div>
            <div className="space-y-8">
              {spacingBlocks.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-gray-500 mb-3">
                    Spacing scale
                  </div>
                  <div className="flex items-end gap-4 flex-wrap">
                    {spacingBlocks.map(({ key, px }) => (
                      <div key={key} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => { navigator.clipboard.writeText(`${px}px`); addToast(`Spacing ${key}`, `${px}px`); }} title={`Click to copy ${px}px`}>
                        <div
                          className="bg-black shadow-brutal-sm group-hover:opacity-70 transition-opacity"
                          style={{
                            width: `${Math.max((px / maxSpace) * 64, 8)}px`,
                            height: `${Math.max((px / maxSpace) * 64, 8)}px`,
                          }}
                        />
                        <div className="text-center">
                          <div className="font-mono text-[10px] font-bold text-black uppercase">
                            {key}
                          </div>
                          <div className="font-mono text-[10px] text-gray-500 group-hover:text-black transition-colors">
                            {px}px
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {radiusBlocks.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-gray-500 mb-3 flex items-center gap-1">
                    <CircleDot size={12} />
                    Rounded corners
                  </div>
                  <div className="flex items-end gap-6 flex-wrap">
                    {radiusBlocks.map(({ key, px }) => (
                      <div key={key} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => { navigator.clipboard.writeText(`${px}px`); addToast(`Radius ${key}`, `${px}px`); }} title={`Click to copy ${px}px`}>
                        <div
                          className="w-16 h-16 bg-white border-4 border-black shadow-brutal-sm group-hover:bg-gray-100 transition-colors"
                          style={{ borderRadius: px }}
                        />
                        <div className="text-center">
                          <div className="font-mono text-[10px] font-bold text-black uppercase">
                            {key}
                          </div>
                          <div className="font-mono text-[10px] text-gray-500 group-hover:text-black transition-colors">
                            {px}px
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {spacingBlocks.length === 0 && radiusBlocks.length === 0 && (
                <p className="text-sm text-gray-500 font-mono italic">
                  No spacing or radius tokens in frontmatter yet.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
