'use client';

import { motion } from 'framer-motion';

interface MirrorFrameProps {
  url: string | null;
}

export default function MirrorFrame({ url }: MirrorFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full flex flex-col bg-black"
    >
      <div className="p-4 border-b border-white/10">
        <h2 className="font-mono text-xs text-white/60">TARGET VIEWPORT</h2>
      </div>
      <div className="flex-1 relative overflow-hidden inner-glow">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin"
            title="Target webpage"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-sm text-white/40">
              NO URL LOADED
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

