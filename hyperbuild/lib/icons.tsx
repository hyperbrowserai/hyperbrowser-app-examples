import React from "react";

type IconProps = { className?: string };

const Svg = ({ children, className }: React.PropsWithChildren<IconProps>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}>
    {children}
  </svg>
);

export const Icons = {
  Start: (p?: IconProps) => (
    <Svg {...p}>
      <polygon points="8,6 18,12 8,18 8,6" />
    </Svg>
  ),
  End: (p?: IconProps) => (
    <Svg {...p}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </Svg>
  ),
  Scrape: (p?: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </Svg>
  ),
  Crawl: (p?: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="2" />
      <circle cx="6" cy="6" r="1.5" />
      <circle cx="18" cy="6" r="1.5" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
      <path d="M10.5 10.5L7.5 7.5M13.5 10.5l4-4M10.5 13.5l-4 4M13.5 13.5l4 4" />
    </Svg>
  ),
  Extract: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </Svg>
  ),
  Transform: (p?: IconProps) => (
    <Svg {...p}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </Svg>
  ),
  LLM: (p?: IconProps) => (
    <Svg {...p}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Svg>
  ),
  QnAGenerator: (p?: IconProps) => (
    <Svg {...p}>
      <rect x="6" y="4" width="12" height="14" rx="2" />
      <rect x="8" y="1" width="8" height="3" rx="1" />
      <circle cx="9.5" cy="9" r="1" />
      <circle cx="14.5" cy="9" r="1" />
      <path d="M9 13h6" />
      <path d="M6 18h12v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3z" />
    </Svg>
  ),
  Condition: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M6 12h12M12 6l6 6-6 6" />
    </Svg>
  ),
  While: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M6 10a6 6 0 1 1 0 4M6 10v-3M6 14v3" />
    </Svg>
  ),
  Approval: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M6 12l3 3 9-9" />
    </Svg>
  ),
  Output: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v10M8 11l4 4 4-4" />
    </Svg>
  ),
  Builder: (p?: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </Svg>
  ),
  Bolt: (p?: IconProps) => (
    <Svg {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
  Generate: (p?: IconProps) => (
    <Svg {...p}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </Svg>
  ),
};

export function getIcon(name: string) {
  const key = name as keyof typeof Icons;
  return Icons[key] || Icons.Transform;
}


