import Image from "next/image";
import type { SignalSource } from "@/lib/types";

const sourceIconSrc: Record<SignalSource, string> = {
  hackernews: "/icons/HackerNews.png",
  github: "/icons/GitHub.png",
  reddit: "/icons/Reddit.png",
  hyperbrowser: "/icons/Hyperbrowser.png",
};

const sourceAlt: Record<SignalSource, string> = {
  hackernews: "Hacker News",
  github: "GitHub",
  reddit: "Reddit",
  hyperbrowser: "Hyperbrowser",
};

type SourceIconProps = {
  source: SignalSource;
  size?: number;
  decorative?: boolean;
  className?: string;
};

export function SourceIcon({
  source,
  size = 16,
  decorative = true,
  className = "",
}: SourceIconProps) {
  return (
    <Image
      src={sourceIconSrc[source]}
      alt={decorative ? "" : sourceAlt[source]}
      aria-hidden={decorative}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
