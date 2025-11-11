declare module 'react-force-graph-2d' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface GraphData {
    nodes: any[];
    links: any[];
  }

  export interface ForceGraph2DProps {
    graphData: GraphData;
    width?: number;
    height?: number;
    backgroundColor?: string;
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeRelSize?: number;
    nodeVal?: number | string | ((node: any) => number);
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    linkColor?: string | ((link: any) => string);
    linkWidth?: number | ((link: any) => number);
    linkDirectionalParticles?: number | ((link: any) => number);
    linkDirectionalParticleWidth?: number | ((link: any) => number);
    linkDirectionalParticleSpeed?: number | ((link: any) => number);
    linkDirectionalParticleColor?: string | ((link: any) => string);
    enableNodeDrag?: boolean;
    enableZoomInteraction?: boolean;
    enablePanInteraction?: boolean;
    cooldownTicks?: number;
    onNodeHover?: (node: any | null) => void;
    onNodeClick?: (node: any, event: MouseEvent) => void;
    onNodeDragEnd?: (node: any) => void;
    onEngineStop?: () => void;
    d3Force?: (forceName: string, force?: any) => any;
  }

  export interface ForceGraph2DMethods {
    d3Force(forceName: string, force?: any): any;
    zoomToFit(duration?: number, padding?: number): void;
  }

  const ForceGraph2D: ForwardRefExoticComponent<ForceGraph2DProps & RefAttributes<ForceGraph2DMethods>>;
  export default ForceGraph2D;
}

