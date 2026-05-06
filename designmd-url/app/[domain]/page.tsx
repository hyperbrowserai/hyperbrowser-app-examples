import { DesignApp } from "@/components/design-app";
import { notFound } from "next/navigation";

interface DomainPageProps {
  params: { domain: string };
}

function isLikelyDomainSegment(raw: string): boolean {
  if (!raw || raw.length > 253) return false;
  if (/\.(ico|svg|png|json|webp|gif|txt|xml|map|js|css|woff2?|ttf|eot)$/i.test(raw)) return false;
  if (raw.includes("/") || raw.includes("\\")) return false;
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])+)+$/.test(raw);
}

export default function DomainPage({ params }: DomainPageProps) {
  const domain = decodeURIComponent(params.domain ?? "");
  if (!isLikelyDomainSegment(domain)) {
    notFound();
  }
  return <DesignApp initialDomain={domain} enforceRedirectWithoutKey />;
}
