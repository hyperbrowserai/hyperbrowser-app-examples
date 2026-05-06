"use client";

import { useEffect } from "react";
import { buildGoogleFontsHref } from "@/lib/fonts";

export function useGoogleFontsInjection(families: (string | undefined | null)[]) {
  const href = buildGoogleFontsHref(families);

  useEffect(() => {
    if (!href) return;
    const id = `hb-gf-${btoa(href)}`.replace(/[^a-zA-Z0-9_-]/g, "");
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [href]);
}
