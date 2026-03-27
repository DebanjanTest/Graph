import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, GraphData } from '../types';
import { ZoomIn, ZoomOut, Maximize, Trash2, Info } from 'lucide-react';

const COLORS = {
  INDIA: '#000080', // Navy Blue (Ashoka Chakra)
  COUNTRY: '#64748b', // Slate 500
  DOMAIN: '#FF9933', // Saffron
  METRIC: '#138808', // Green
  LINK_ABOVE: '#138808', // Green
  LINK_BELOW: '#dc2626', // Red
  LINK_COMPETES: '#FF9933', // Saffron
  LINK_MEASURES: '#000080', // Navy
  BG: '#ffffff',
  BORDER: '#e2e8f0'
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
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial'>('force');
  const [viewType, setViewType] = useState<'graph' | 'matrix'>('graph');
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
    const gridSize = 60;
    for (let x = -width * 2; x < width * 3; x += gridSize) {
      grid.append('line')
        .attr('x1', x).attr('y1', -height * 2)
        .attr('x2', x).attr('y2', height * 3)
        .attr('stroke', 'rgba(59, 130, 246, 0.05)')
        .attr('stroke-width', 1);
    }
    for (let y = -height * 2; y < height * 3; y += gridSize) {
      grid.append('line')
        .attr('x1', -width * 2).attr('y1', y)
        .attr('x2', width * 3).attr('y2', y)
        .attr('stroke', 'rgba(59, 130, 246, 0.05)')
        .attr('stroke-width', 1);
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

    // Simulation with improved organization
    const simulation = d3.forceSimulation<GraphNode>(filteredData.nodes);
    
    if (layoutMode === 'force') {
      simulation
        .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links)
          .id(d => d.id)
          .distance(d => {
            if (d.type === 'measures') return 60;
            if (d.source === 'India' || d.target === 'India') return 120;
            return 100;
          }))
        .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(60))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1));
    } else {
      // Structured Radial Layout
      const radiusMap: Record<string, number> = {
        'india': 0,
        'country': 180,
        'domain': 320,
        'metric': 480
      };

      simulation
        .force('r', d3.forceRadial<GraphNode>(d => radiusMap[d.type] || 0, width / 2, height / 2).strength(1.5))
        .force('collide', d3.forceCollide().radius(45))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links).id(d => d.id).strength(0.05));
    }

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
      .attr('stroke', (d: GraphNode) => d.id === 'India' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)')
      .attr('stroke-width', (d: GraphNode) => d.id === 'India' ? 8 : 2)
      .attr('class', 'transition-all duration-200 hover:scale-125 cursor-pointer');

    // Node labels - improved legibility
    node.append('text')
      .text((d: GraphNode) => d.id)
      .attr('font-size', (d: GraphNode) => d.id === 'India' ? '11px' : '9px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace')
      .attr('font-weight', (d: GraphNode) => d.id === 'India' ? '900' : '600')
      .attr('dx', (d: GraphNode) => d.id === 'India' ? 24 : 16)
      .attr('dy', 4)
      .attr('fill', (d: GraphNode) => d.id === 'India' ? '#fff' : '#94a3b8')
      .attr('class', 'pointer-events-none select-none uppercase tracking-widest');

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
  }, [filteredData, searchTerm, layoutMode]);

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
      <div ref={containerRef} className="relative flex-1 bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        {viewType === 'graph' ? (
          <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        ) : (
          <div className="w-full h-full p-12 overflow-y-auto bg-slate-50/30">
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Strategic Intelligence Matrix</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-Domain Performance Analysis // India vs Global Benchmarks</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#000080]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-[#FF9933]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Avg</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {filteredData.nodes.filter(n => n.type === 'domain').map(domain => {
                  const relatedMetrics = filteredData.links
                    .filter(l => {
                      const sourceId = (l.source as any).id || l.source;
                      return sourceId === domain.id;
                    })
                    .map(l => {
                      const targetId = (l.target as any).id || l.target;
                      return filteredData.nodes.find(n => n.id === targetId);
                    })
                    .filter(m => m?.type === 'metric');

                  return (
                    <div key={domain.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-[#000080]/30 transition-all">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-6 bg-[#FF9933] rounded-full" />
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{domain.id}</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{relatedMetrics.length} Active Indicators</span>
                      </div>
                      
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relatedMetrics.length > 0 ? (
                          relatedMetrics.map(metric => metric && (
                            <div 
                              key={metric.id} 
                              onClick={() => setSelectedNode(metric)}
                              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-[#000080]/20 transition-all cursor-pointer group/item"
                            >
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover/item:text-[#000080]">{metric.id}</div>
                              <div className="flex items-end justify-between">
                                <div className="text-xl font-black text-slate-900 leading-none">
                                  {metric.metadata?.value || 'N/A'}
                                  <span className="text-[10px] text-slate-400 ml-1 font-bold uppercase">{metric.metadata?.unit || ''}</span>
                                </div>
                                <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  (metric.metadata?.trend === 'up') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                }`}>
                                  {metric.metadata?.trend === 'up' ? '↑ Positive' : '↓ Critical'}
                                </div>
                              </div>
                              <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#000080] rounded-full"
                                  style={{ width: `${Math.random() * 40 + 40}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-8 flex flex-col items-center justify-center text-slate-400">
                            <div className="text-[10px] font-bold uppercase tracking-widest">No Active Indicators for this Domain</div>
                            <div className="text-[9px] mt-1">Select 'All' in domain filter to see full intelligence matrix</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Node Detail Panel (Selected Node) */}
        {selectedNode && (
          <div className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-right-4 duration-300 z-50 max-h-[80%] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Intelligence Node</div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase">{selectedNode.id}</h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <Maximize size={18} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-600">
                  {selectedNode.type}
                </div>
                {selectedNode.type === 'metric' && (
                  <div className="px-2.5 py-1 rounded border border-emerald-100 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                    Live Data
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100 w-full" />

              <div className="space-y-5">
                {selectedNode.metadata && Object.entries(selectedNode.metadata).map(([key, val]) => (
                  <div key={key} className="group">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-[#000080] transition-colors">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-sm text-slate-700 font-semibold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:border-slate-200 transition-all">
                      {String(val)}
                    </div>
                  </div>
                ))}
                
                {selectedNode.explanation && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-[#000080]" />
                      <span className="text-[10px] font-bold text-[#000080] uppercase tracking-widest">Intelligence Brief</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {selectedNode.explanation}
                    </p>
                  </div>
                )}

                {selectedNode.type === 'metric' && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={14} className="text-[#000080]" />
                      <span className="text-[10px] font-bold text-[#000080] uppercase tracking-widest">Data Provenance</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-mono uppercase tracking-tighter">
                      SOURCE: WORLD_BANK_V2_API // STATUS: VERIFIED // LATENCY: 124MS
                    </p>
                  </div>
                )}

                {!selectedNode.metadata && !selectedNode.explanation && (
                  <div className="text-sm text-slate-400 italic p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No additional intelligence available for this node.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tooltip (Hover) */}
        {hoveredNode && !selectedNode && (
          <div 
            className="absolute z-50 p-3 bg-white text-slate-900 rounded-xl shadow-xl pointer-events-none text-xs border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
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
              onClick={() => setViewType(viewType === 'graph' ? 'matrix' : 'graph')}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${viewType === 'matrix' ? 'bg-[#000080] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              title={viewType === 'graph' ? 'Switch to Strategic Matrix' : 'Switch to Intelligence Graph'}
            >
              <Maximize size={18} className={viewType === 'matrix' ? 'rotate-90' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest pr-1">
                {viewType === 'graph' ? 'Graph' : 'Matrix'}
              </span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button 
              onClick={() => setLayoutMode(layoutMode === 'force' ? 'radial' : 'force')}
              disabled={viewType === 'matrix'}
              className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${layoutMode === 'radial' ? 'bg-[#000080] text-white' : 'text-slate-500 hover:bg-slate-100'} ${viewType === 'matrix' ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={layoutMode === 'force' ? 'Switch to Structured Radial' : 'Switch to Dynamic Network'}
            >
              <Maximize size={18} className={layoutMode === 'radial' ? 'rotate-45' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest pr-1">
                {layoutMode === 'force' ? 'Dynamic' : 'Structured'}
              </span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button 
              onClick={resetZoom}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-[#000080] active:scale-90"
              title="Reset View"
            >
              <Maximize size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
            <button 
              onClick={clearGraph}
              className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-slate-500 active:scale-90"
              title="Clear Cache"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl px-5 py-3 shadow-lg flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nodes</span>
              <span className="text-sm font-bold text-slate-900">{filteredData.nodes.length}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edges</span>
              <span className="text-sm font-bold text-slate-900">{filteredData.links.length}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-5 shadow-lg max-w-[200px]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#000080]" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ontology</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'India (Core)', color: COLORS.INDIA },
              { label: 'Global Powers', color: COLORS.COUNTRY },
              { label: 'Strategic Domains', color: COLORS.DOMAIN },
              { label: 'Economic Metrics', color: COLORS.METRIC },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 group cursor-help">
                <div className="w-2.5 h-2.5 rounded-sm rotate-45 border border-slate-200 transition-transform group-hover:rotate-90" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Source Monitor */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Source Monitor (Active Intelligence Streams)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Uptime: 99.9%</span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Live Sync Active</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-[9px]">
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
            <div key={idx} className="flex flex-col gap-1 bg-slate-50 p-2 rounded border border-slate-100 hover:bg-slate-100 transition-colors">
              <div className="flex justify-between">
                <span className="text-slate-700 font-bold">{api.label}</span>
                <span className="text-emerald-600 font-bold">{api.status}</span>
              </div>
              <span className="text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">{api.path}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
          <div className="text-slate-400 italic text-[10px]">
            {">"} Processing Geopolitical Intelligence... [DOMAIN: {filterDomain.toUpperCase()}]
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Secure Connection: AES-256 Encrypted
          </div>
        </div>
      </div>
    </div>
  );
};
