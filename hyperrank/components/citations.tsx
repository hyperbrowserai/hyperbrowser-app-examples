import { LinkIcon } from "lucide-react";

export function Citations({ sources }: { sources: string[] }) {
  return (
    <div className="border-4 border-black bg-white p-6 shadow-brutal">
      <h3 className="text-xl font-black uppercase tracking-tight mb-4">
        Citation sources
      </h3>
      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 font-medium">
          No citation sources detected.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sources.map((s, i) => (
            <li
              key={i}
              className="border-2 border-black bg-gray-50 px-3 py-2 flex items-center gap-2 text-sm font-mono break-all"
            >
              <LinkIcon size={14} strokeWidth={2.5} className="shrink-0" />
              <a
                href={s.startsWith("http") ? s : `https://${s}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {s}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
