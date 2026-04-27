"use client";

interface AutoStatusBarProps {
  currentUrl: string;
  isConnected: boolean;
  agentStatus: string;
}

export default function AutoStatusBar({
  currentUrl,
  isConnected,
  agentStatus,
}: AutoStatusBarProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-2 border-t-4 border-black bg-gray-50">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isConnected ? "bg-green-500" : "bg-yellow-400"
          }`}
        />
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-gray-600 truncate">
          {agentStatus ||
            (isConnected ? "Live session" : "Connecting...")}
        </span>
      </div>
      {currentUrl ? (
        <span className="font-mono text-xs text-gray-500 truncate" title={currentUrl}>
          {currentUrl}
        </span>
      ) : null}
    </div>
  );
}
