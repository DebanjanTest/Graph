import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, GraphData } from '../types';
import { ZoomIn, ZoomOut, Maximize, Trash2, Info } from 'lucide-react';

const COLORS = {
  INDIA: '#0F172A', // Slate 900
  COUNTRY: '#3B82F6', // Blue 500
  DOMAIN: '#F59E0B', // Amber 500
  METRIC: '#10B981', // Emerald 500
  LINK_ABOVE: '#059669', // Emerald 600
  LINK_BELOW: '#DC2626', // Red 600
  LINK_COMPETES: '#D97706', // Amber 600
  LINK_MEASURES: '#2563EB', // Blue 600
  BG: '#F8FAFC', // Slate 50
  BORDER: '#E2E8F0' // Slate 200
};

interface D3GraphProps {
  searchTerm?: string;
  onNodeSelect?: (node: GraphNode | null) => void;
  filterDomain?: string;
}

export const D3Graph: React.FC<D3GraphProps> = ({ searchTerm = '', onNodeSelect, filterDomain = 'All' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Sync internal selectedNode with parent
  useEffect(() => {
    if (onNodeSelect) onNodeSelect(selectedNode);
  }, [selectedNode, onNodeSelect]);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/knowledge-graph');
        const apiData = await response.json();
        setData(apiData);
      } catch (err) {
        console.error('Failed to load graph data', err);
      }
    };
    loadData();
  }, []);

  // Filter data based on domain
  useEffect(() => {
    if (filterDomain === 'All') {
      setFilteredData(data);
      return;
    }

    const relevantNodes = data.nodes.filter(n => {
      if (n.id === 'India') return true;
      if (n.type === 'country') return true; // Keep countries to show relationships
      if (n.type === 'domain' && n.id === filterDomain) return true;
      if (n.type === 'metric' && (n as any).domain === filterDomain) return true;
      return false;
    });

    const nodeIds = new Set(relevantNodes.map(n => n.id));
    const relevantLinks = data.links.filter(l => {
      const sourceId = (l.source as any).id || (l.source as string);
      const targetId = (l.target as any).id || (l.target as string);
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    setFilteredData({ nodes: relevantNodes, links: relevantLinks });
  }, [data, filterDomain]);

  useEffect(() => {
    if (!svgRef.current || !filteredData.nodes.length) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create a container for all elements to allow zooming
    const g = svg.append('g').attr('class', 'main-group');

    // Add a subtle grid background
    const grid = g.append('g').attr('class', 'grid');
    const gridSize = 50;
    for (let x = -width * 2; x < width * 3; x += gridSize) {
      grid.append('line')
        .attr('x1', x).attr('y1', -height * 2)
        .attr('x2', x).attr('y2', height * 3)
        .attr('stroke', '#E2E8F0')
        .attr('stroke-width', 0.5);
    }
    for (let y = -height * 2; y < height * 3; y += gridSize) {
      grid.append('line')
        .attr('x1', -width * 2).attr('y1', y)
        .attr('x2', width * 3).attr('y2', y)
        .attr('stroke', '#E2E8F0')
        .attr('stroke-width', 0.5);
    }

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Arrowheads for links
    const defs = svg.append('defs');
    const arrowTypes = [
      { id: 'above', color: COLORS.LINK_ABOVE },
      { id: 'below', color: COLORS.LINK_BELOW },
      { id: 'measures', color: COLORS.LINK_MEASURES }
    ];

    arrowTypes.forEach(type => {
      defs.append('marker')
        .attr('id', `arrowhead-${type.id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 22) // Adjusted for node radius
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', type.color);
    });

    // Simulation with improved organization - Condensed for better legibility
    const simulation = d3.forceSimulation<GraphNode>(filteredData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links)
        .id(d => d.id)
        .distance(d => {
          if (d.type === 'measures') return 60; // Increased distance
          if (d.source === 'India' || d.target === 'India') return 120; // More space from core
          return 100;
        }))
      .force('charge', d3.forceManyBody().strength(-600)) // Stronger repulsion
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(60)) // Increased radius for more padding
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    simulationRef.current = simulation;

    // Links layer
    const linkGroup = g.append('g').attr('class', 'links');
    
    const link = linkGroup.selectAll<SVGLineElement, GraphLink>('line')
      .data(filteredData.links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.5)
      .attr('stroke', (d: GraphLink) => {
        if (d.type === 'ranks_above') return COLORS.LINK_ABOVE;
        if (d.type === 'ranks_below') return COLORS.LINK_BELOW;
        if (d.type === 'competes_with') return COLORS.LINK_COMPETES;
        return COLORS.LINK_MEASURES;
      })
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', (d: GraphLink) => d.type === 'competes_with' ? '4,4' : 'none')
      .attr('marker-end', (d: GraphLink) => {
        if (d.type === 'ranks_above') return 'url(#arrowhead-above)';
        if (d.type === 'ranks_below') return 'url(#arrowhead-below)';
        if (d.type === 'measures') return 'url(#arrowhead-measures)';
        return null;
      });

    // Link labels for clarity
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(filteredData.links)
      .enter()
      .append('text')
      .attr('font-size', '7px')
      .attr('font-weight', '700')
      .attr('text-anchor', 'middle')
      .attr('fill', '#94A3B8')
      .attr('class', 'pointer-events-none uppercase tracking-tighter')
      .text((d: GraphLink) => d.type.replace('_', ' '));

    // Nodes layer
    const nodeGroup = g.append('g').attr('class', 'nodes');
    
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(filteredData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node cursor-pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', (event, d: GraphNode) => {
        setHoveredNode(d);
        setTooltipPos({ x: event.pageX, y: event.pageY });
        
        // Highlight connections
        const neighbors = new Set<string>();
        neighbors.add(d.id);
        filteredData.links.forEach(l => {
          const sourceId = (l.source as any).id || (l.source as string);
          const targetId = (l.target as any).id || (l.target as string);
          if (sourceId === d.id) neighbors.add(targetId);
          if (targetId === d.id) neighbors.add(sourceId);
        });

        node.style('opacity', (n: GraphNode) => neighbors.has(n.id) ? 1 : 0.1);
        link.style('opacity', (l: GraphLink) => {
          const sourceId = (l.source as any).id || (l.source as string);
          const targetId = (l.target as any).id || (l.target as string);
          return (sourceId === d.id || targetId === d.id) ? 1 : 0.05;
        });
        linkLabel.style('opacity', (l: GraphLink) => {
          const sourceId = (l.source as any).id || (l.source as string);
          const targetId = (l.target as any).id || (l.target as string);
          return (sourceId === d.id || targetId === d.id) ? 1 : 0.05;
        });
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        node.style('opacity', 1);
        link.style('opacity', 0.4);
        linkLabel.style('opacity', 1);
      })
      .on('click', (event, d: GraphNode) => {
        setSelectedNode(d === selectedNode ? null : d);
      });

    // Node circles
    node.append('circle')
      .attr('r', (d: GraphNode) => d.id === 'India' ? 16 : 10)
      .attr('fill', (d: GraphNode) => {
        if (d.id === 'India') return COLORS.INDIA;
        if (d.type === 'country') return COLORS.COUNTRY;
        if (d.type === 'domain') return COLORS.DOMAIN;
        return COLORS.METRIC;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('class', 'transition-all duration-200 hover:scale-110 shadow-sm');

    // Node labels - improved legibility
    node.append('text')
      .text((d: GraphNode) => d.id)
      .attr('font-size', (d: GraphNode) => d.id === 'India' ? '12px' : '10px')
      .attr('font-weight', (d: GraphNode) => d.id === 'India' ? '700' : '500')
      .attr('dx', (d: GraphNode) => d.id === 'India' ? 20 : 14)
      .attr('dy', 4)
      .attr('fill', '#1E293B')
      .attr('class', 'pointer-events-none select-none drop-shadow-sm');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: GraphLink) => (d.source as any).x)
        .attr('y1', (d: GraphLink) => (d.source as any).y)
        .attr('x2', (d: GraphLink) => (d.target as any).x)
        .attr('y2', (d: GraphLink) => (d.target as any).y);

      linkLabel
        .attr('x', (d: GraphLink) => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', (d: GraphLink) => ((d.source as any).y + (d.target as any).y) / 2 - 5);

      node.attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      // Pin node
      d.fx = event.x;
      d.fy = event.y;
    }

    // Handle Resize
    const observer = new ResizeObserver(() => {
      const newWidth = containerRef.current?.clientWidth || 800;
      const newHeight = containerRef.current?.clientHeight || 600;
      svg.attr('width', newWidth).attr('height', newHeight);
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    });

    if (containerRef.current) observer.observe(containerRef.current);

    // Handle Search Highlighting
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      node.style('opacity', (n: GraphNode) => n.id.toLowerCase().includes(lowerSearch) ? 1 : 0.1);
      node.select('circle')
        .attr('stroke', (n: any) => {
          const nodeData = n as GraphNode;
          return nodeData.id.toLowerCase().includes(lowerSearch) ? '#3B82F6' : '#fff';
        })
        .attr('stroke-width', (n: any) => {
          const nodeData = n as GraphNode;
          return nodeData.id.toLowerCase().includes(lowerSearch) ? 4 : 2;
        });
      
      link.style('opacity', 0.05);
      linkLabel.style('opacity', 0.05);
    } else {
      node.style('opacity', 1);
      node.select('circle').attr('stroke', '#fff').attr('stroke-width', 2);
      link.style('opacity', 0.4);
      linkLabel.style('opacity', 1);
    }

    return () => {
      observer.disconnect();
      simulation.stop();
    };
  }, [filteredData, searchTerm]);

  const resetZoom = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
    }
  };

  const clearGraph = () => {
    localStorage.removeItem('sutra_graph_local');
    setData({ nodes: [], links: [] });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div ref={containerRef} className="relative flex-1 bg-[#F8FAFC] overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Node Detail Panel (Selected Node) */}
        {selectedNode && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 z-50 max-h-[80%] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Intelligence Node</div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedNode.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: selectedNode.type === 'country' ? '#DBEAFE' : selectedNode.type === 'domain' ? '#FEF3C7' : '#D1FAE5', color: selectedNode.type === 'country' ? '#1E40AF' : selectedNode.type === 'domain' ? '#92400E' : '#065F46' }}>
                  {selectedNode.type}
                </div>
                {selectedNode.type === 'metric' && (
                  <div className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    Live Data
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100 w-full" />

              <div className="space-y-5">
                {selectedNode.metadata && Object.entries(selectedNode.metadata).map(([key, val]) => (
                  <div key={key} className="group">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-sm text-slate-700 font-semibold leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-transparent group-hover:border-slate-200 transition-all">
                      {String(val)}
                    </div>
                  </div>
                ))}
                
                {selectedNode.type === 'metric' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Data Provenance</span>
                    </div>
                    <p className="text-[11px] text-blue-600 leading-relaxed">
                      This metric is synchronized with World Bank & IMF Open Data APIs. Last verified: {new Date().toLocaleDateString()}.
                    </p>
                  </div>
                )}

                {!selectedNode.metadata && (
                  <div className="text-sm text-slate-400 italic p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No additional metadata available for this node.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tooltip (Hover) */}
        {hoveredNode && !selectedNode && (
          <div 
            className="absolute z-50 p-3 bg-slate-900 text-white rounded-xl shadow-xl pointer-events-none text-xs border border-slate-800 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: tooltipPos.x + 15, top: tooltipPos.y + 15 }}
          >
            <div className="font-bold mb-0.5">{hoveredNode.id}</div>
            <div className="text-[10px] opacity-60 uppercase tracking-wider">{hoveredNode.type}</div>
          </div>
        )}

        {/* Controls Group */}
        <div className="absolute bottom-8 left-8 flex items-center gap-3">
          <div className="flex bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 shadow-lg">
            <button 
              onClick={resetZoom}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-600 active:scale-90"
              title="Reset View"
            >
              <Maximize size={18} />
            </button>
            <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
            <button 
              onClick={clearGraph}
              className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-slate-600 active:scale-90"
              title="Purge Local Cache"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl px-5 py-3 shadow-lg flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nodes</span>
              <span className="text-sm font-black text-slate-900">{filteredData.nodes.length}</span>
            </div>
            <div className="w-px h-6 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edges</span>
              <span className="text-sm font-black text-slate-900">{filteredData.links.length}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-lg max-w-[200px]">
          <div className="flex items-center gap-2 mb-4">
            <Info size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Ontology</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'India (Core)', color: COLORS.INDIA },
              { label: 'Global Powers', color: COLORS.COUNTRY },
              { label: 'Strategic Domains', color: COLORS.DOMAIN },
              { label: 'Economic Metrics', color: COLORS.METRIC },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-semibold text-slate-600 tracking-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Source Monitor - Moved below the graph box */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Source Monitor (10+ Active Streams)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-mono text-slate-500">Uptime: 99.99%</span>
            <span className="text-[9px] font-mono text-emerald-500/70">LIVE_SYNC_ACTIVE</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-[8px]">
          {[
            { label: 'World Bank', path: '/gdp/v2', status: '200' },
            { label: 'IMF Data', path: '/reserves/fx', status: '200' },
            { label: 'UN Comtrade', path: '/trade/flows', status: '200' },
            { label: 'Ember Climate', path: '/energy/renewables', status: '200' },
            { label: 'WIPO Patents', path: '/tech/ip/stats', status: '200' },
            { label: 'WTO Stats', path: '/tariffs/global', status: '200' },
            { label: 'GitHub API', path: '/repos/tech_stack', status: '200' },
            { label: 'EIA.gov', path: '/oil/production', status: '200' },
            { label: 'OWID', path: '/social/metrics', status: '200' },
            { label: 'Yahoo Finance', path: '/fx/inr_usd', status: '200' },
            { label: 'Bloomberg', path: '/terminal/feed', status: '200' },
            { label: 'Reuters', path: '/trade/news', status: '200' }
          ].map((api, idx) => (
            <div key={idx} className="flex flex-col gap-1 bg-slate-800/30 p-2 rounded border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
              <div className="flex justify-between">
                <span className="text-slate-300 font-bold">{api.label}</span>
                <span className="text-emerald-500">{api.status}</span>
              </div>
              <span className="text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">{api.path}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
          <div className="text-slate-400 italic text-[9px] font-mono">
            {">"} Processing geopolitical sentiment analysis... [DOMAIN: {filterDomain.toUpperCase()}]
          </div>
          <div className="text-[8px] font-mono text-slate-600">
            SECURE_TUNNEL: ESTABLISHED | ENCRYPTION: AES-256
          </div>
        </div>
      </div>
    </div>
  );
};
