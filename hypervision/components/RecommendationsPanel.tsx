'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GraphData } from '@/lib/hyperbrowser';

interface RecommendationsPanelProps {
  graph: GraphData | null;
  metadata: any;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

function generateRecommendations(graph: GraphData | null, metadata: any): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!graph || !metadata) return recommendations;

  // Check meta description
  if (!metadata.description || metadata.description.length < 50) {
    recommendations.push({
      title: 'Add Meta Description',
      description: metadata.description 
        ? 'Meta description is too short. Aim for 150-160 characters for better SEO.'
        : 'Missing meta description. This helps search engines understand your page content.',
      priority: 'HIGH',
      category: 'SEO',
    });
  }

  // Check title length
  if (metadata.title && metadata.title.length > 60) {
    recommendations.push({
      title: 'Optimize Page Title',
      description: `Title is ${metadata.title.length} characters. Keep it under 60 characters to avoid truncation in search results.`,
      priority: 'MEDIUM',
      category: 'SEO',
    });
  }

  // Check for content nodes
  const contentNode = graph.nodes.find(n => n.id === 'content');
  if (contentNode && contentNode.val < 15) {
    recommendations.push({
      title: 'Increase Content Depth',
      description: 'Page content appears thin. Consider adding more detailed, valuable content to improve user experience and SEO.',
      priority: 'HIGH',
      category: 'Content',
    });
  }

  // Check metadata nodes
  const metadataNodes = graph.nodes.filter(n => n.group === 4);
  if (metadataNodes.length < 3) {
    recommendations.push({
      title: 'Add More Metadata',
      description: 'Limited metadata detected. Consider adding Open Graph tags, Twitter Cards, and structured data (schema.org).',
      priority: 'MEDIUM',
      category: 'SEO',
    });
  }

  // Check semantic understanding
  const semanticNodes = graph.nodes.filter(n => n.group === 6);
  if (semanticNodes.length < 2) {
    recommendations.push({
      title: 'Improve Content Structure',
      description: 'Limited semantic understanding detected. Use proper heading hierarchy (H1-H6) and semantic HTML elements.',
      priority: 'MEDIUM',
      category: 'Structure',
    });
  }

  // Check graph complexity
  if (graph.nodes.length < 8) {
    recommendations.push({
      title: 'Enrich Page Structure',
      description: 'Simple page structure detected. Consider adding more sections, structured data, and semantic elements for better AI understanding.',
      priority: 'LOW',
      category: 'Structure',
    });
  }

  // Check for language complexity
  const langNode = graph.nodes.find(n => n.id === 'language_complexity');
  const textNode = graph.nodes.find(n => n.id === 'textual');
  if (textNode && textNode.val < 10) {
    recommendations.push({
      title: 'Add More Textual Content',
      description: 'Limited text content detected. Search engines and users both benefit from comprehensive, well-written content.',
      priority: 'HIGH',
      category: 'Content',
    });
  }

  // Always add some positive feedback if page is good
  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Well-Optimized Page',
      description: 'Your page shows good structure and metadata. Continue monitoring and updating content regularly.',
      priority: 'LOW',
      category: 'Summary',
    });
  }

  return recommendations;
}

export default function RecommendationsPanel({ graph, metadata }: RecommendationsPanelProps) {
  const recommendations = generateRecommendations(graph, metadata);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-400 border-red-400/20 bg-red-950/20';
      case 'MEDIUM': return 'text-yellow-400 border-yellow-400/20 bg-yellow-950/20';
      case 'LOW': return 'text-green-400 border-green-400/20 bg-green-950/20';
      default: return 'text-white/40 border-white/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-white/60">AI RECOMMENDATIONS</h3>
        <span className="font-mono text-[10px] text-white/30">
          {recommendations.length} {recommendations.length === 1 ? 'ISSUE' : 'ISSUES'}
        </span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className={`bg-black border p-4 ${getPriorityColor(rec.priority)}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="font-sans text-sm font-semibold text-white mb-1">
                    {rec.title}
                  </h4>
                  <span className="font-mono text-[10px] text-white/40">
                    {rec.category}
                  </span>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${getPriorityColor(rec.priority)}`}>
                  {rec.priority}
                </span>
              </div>
              <p className="font-sans text-sm text-white/70 leading-relaxed">
                {rec.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

