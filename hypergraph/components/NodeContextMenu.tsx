"use client";

interface NodeContextMenuProps {
  x: number;
  y: number;
  canGoDeeper: boolean;
  goDeeperDisabledReason?: string;
  onGoDeeper: () => void;
  onViewContent: () => void;
  onCopySkill: () => void;
  onClose: () => void;
}

export default function NodeContextMenu({
  x,
  y,
  canGoDeeper,
  goDeeperDisabledReason,
  onGoDeeper,
  onViewContent,
  onCopySkill,
  onClose,
}: NodeContextMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="fixed z-50 min-w-[180px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        style={{ left: x, top: y }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          disabled={!canGoDeeper}
          title={goDeeperDisabledReason}
          onClick={() => {
            if (!canGoDeeper) return;
            onGoDeeper();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
        >
          Go Deeper
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewContent();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
        >
          View Content
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onCopySkill();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
        >
          Copy as SKILL.md
        </button>
      </div>
    </>
  );
}
