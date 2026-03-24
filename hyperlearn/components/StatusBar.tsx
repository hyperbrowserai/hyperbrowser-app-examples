"use client";

interface StatusBarProps {
  currentUrl: string;
  isConnected: boolean;
}

export default function StatusBar({
  currentUrl,
  isConnected,
}: StatusBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t-4 border-black bg-gray-50">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isConnected ? "bg-green-500" : "bg-yellow-400"
        }`}
      />
      <span className="font-mono text-xs text-gray-500 truncate">
        {currentUrl
          ? `Browsing: ${currentUrl}`
          : isConnected
            ? "Connected -- waiting for navigation..."
            : "Connecting..."}
      </span>
    </div>
  );
}
