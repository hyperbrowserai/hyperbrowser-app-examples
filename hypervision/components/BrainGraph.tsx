'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { GraphData } from '@/lib/hyperbrowser';
import type { ForceGraph2DMethods } from 'react-force-graph-2d';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface BrainGraphProps {
  data: GraphData | null;
  selectedNode: string | null;
  onNodeClick: (nodeId: string | null) => void;
}

export default function BrainGraph({ data, selectedNode, onNodeClick }: BrainGraphProps) {
  const graphRef = useRef<ForceGraph2DMethods>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<any>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (graphRef.current && data) {
      graphRef.current.d3Force('charge').strength(-300);
      graphRef.current.d3Force('link').distance(100);
    }
  }, [data]);

  const getNodeId = (nodeOrId: any) => {
    return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
  };

  const isNodeConnected = (node: any) => {
    if (!selectedNode || !data) return true;
    if (node.id === selectedNode) return true;
    
    return data.links.some(
      link => 
        (getNodeId(link.source) === selectedNode && getNodeId(link.target) === node.id) ||
        (getNodeId(link.target) === selectedNode && getNodeId(link.source) === node.id)
    );
  };

  const isLinkConnected = (link: any) => {
    if (!selectedNode) return true;
    return getNodeId(link.source) === selectedNode || getNodeId(link.target) === selectedNode;
  };

  const handleNodeClick = (node: any) => {
    if (selectedNode === node.id) {
      onNodeClick(null);
    } else {
      onNodeClick(node.id);
    }
  };

  const handleBackgroundClick = () => {
    if (selectedNode) {
      onNodeClick(null);
    }
  };

  const handleExport = () => {
    if (!containerRef.current) return;
    
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `hypervision-analysis-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full flex flex-col bg-black relative"
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-mono text-xs text-white/60">AI VISION MODE</h2>
        <div className="flex gap-2">
          {data && data.nodes.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleExport}
              className="font-mono text-[10px] text-white/40 hover:text-white/80 transition-colors px-3 py-1 border border-white/10 rounded hover:border-white/30"
            >
              EXPORT PNG
            </motion.button>
          )}
          {selectedNode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onNodeClick(null)}
              className="font-mono text-[10px] text-white/40 hover:text-white/80 transition-colors px-2 py-1 border border-white/10 rounded"
            >
              RESET VIEW
            </motion.button>
          )}
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden cursor-pointer"
        onClick={handleBackgroundClick}
      >
        {data && data.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            graphData={data}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#000000"
            nodeLabel={(node: any) => `${node.name}`}
            nodeColor={(node: any) => {
              const colors = ['#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0', '#909090', '#808080'];
              const baseColor = colors[node.group - 1] || '#ffffff';
              
              if (selectedNode && node.id === selectedNode) return '#ffffff';
              if (selectedNode && !isNodeConnected(node)) return '#333333';
              
              return baseColor;
            }}
            nodeRelSize={8}
            nodeVal={(node: any) => {
              if (selectedNode && node.id === selectedNode) return node.val * 1.3;
              if (selectedNode && !isNodeConnected(node)) return node.val * 0.6;
              return node.val;
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const isSelected = selectedNode === node.id;
              const isConnected = isNodeConnected(node);
              const nodeRadius = Math.sqrt(node.val) * 8 * (isSelected ? 1.3 : isConnected ? 1 : 0.6);
              
              const colors = ['#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0', '#909090', '#808080'];
              let fillColor = colors[node.group - 1] || '#ffffff';
              
              if (selectedNode) {
                if (isSelected) fillColor = '#ffffff';
                else if (!isConnected) fillColor = '#333333';
              }
              
              ctx.fillStyle = fillColor;
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
              ctx.fill();
              
              if (isSelected || hoveredNode?.id === node.id) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 3 / globalScale;
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
              
              ctx.font = `${fontSize}px "DM Mono", monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#000000';
              
              if (!isConnected && selectedNode) {
                ctx.fillStyle = '#666666';
              }
              
              ctx.fillText(label, node.x, node.y);
              
              if (node.group === 1 || isSelected) {
                ctx.font = `${fontSize * 0.8}px "DM Mono", monospace`;
                ctx.fillStyle = isConnected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(100, 100, 100, 0.2)';
                const metrics = ctx.measureText(label);
                ctx.fillRect(
                  node.x - metrics.width / 2 - 4,
                  node.y + nodeRadius + 4,
                  metrics.width + 8,
                  fontSize + 4
                );
                ctx.fillStyle = isConnected ? '#ffffff' : '#666666';
                ctx.fillText(label, node.x, node.y + nodeRadius + fontSize);
              }
            }}
            linkColor={(link: any) => {
              if (!selectedNode) {
                const opacity = hoveredNode ? 
                  (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id ? 0.4 : 0.1) : 
                  0.2;
                return `rgba(255, 255, 255, ${opacity})`;
              }
              
              return isLinkConnected(link) ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.05)';
            }}
            linkWidth={(link: any) => {
              if (!selectedNode) {
                return hoveredNode && (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id) ? 2.5 : 1.5;
              }
              return isLinkConnected(link) ? 3 : 0.5;
            }}
            linkDirectionalParticles={(link: any) => {
              if (!selectedNode) {
                return hoveredNode && (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id) ? 4 : 2;
              }
              return isLinkConnected(link) ? 6 : 0;
            }}
            linkDirectionalParticleWidth={3}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={() => 'rgba(255, 255, 255, 0.8)'}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            cooldownTicks={100}
            onNodeHover={(node: any) => setHoveredNode(node)}
            onNodeClick={(node: any, event: MouseEvent) => {
              event.stopPropagation();
              handleNodeClick(node);
            }}
            onNodeDragEnd={(node: any) => {
              if (node) {
                node.fx = node.x;
                node.fy = node.y;
              }
            }}
            onEngineStop={() => {
              if (graphRef.current && !selectedNode) {
                graphRef.current.zoomToFit(400, 50);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-mono text-sm text-white/40"
            >
              AWAITING DATA INPUT
            </motion.p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
