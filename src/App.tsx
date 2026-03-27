import { D3Graph } from './components/D3Graph';
import { TugOfWar } from './components/TugOfWar';
import { Network, Database, Shield, Globe, Activity, TrendingUp, Zap, BarChart3, Search, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GraphNode, LiveUpdate, TimeSeriesData, ComparisonData } from './types';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [filterDomain, setFilterDomain] = useState('All');
  const ws = useRef<WebSocket | null>(null);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    ws.current = new WebSocket(`${protocol}//${host}`);

    ws.current.onmessage = (event) => {
      const data: LiveUpdate = JSON.parse(event.data);
      if (data.type === 'SYSTEM_STATUS') {
        setSystemStatus(data.payload);
      } else {
        setLiveUpdates(prev => [data, ...prev].slice(0, 10));
      }
    };

    return () => ws.current?.close();
  }, []);

  // Vector Search Simulation
  useEffect(() => {
    if (searchTerm.length > 1) {
      fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
        .then(res => res.json())
        .then(setSearchResults);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  // Fetch Time Series when node is selected
  useEffect(() => {
    if (selectedNode) {
      fetch(`/api/timeseries/${selectedNode.id}`)
        .then(res => res.json())
        .then(setTimeSeries);
    }
  }, [selectedNode]);

  // Export Report Functionality
  const handleExport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      selectedNode: selectedNode?.id || 'None',
      filterDomain,
      liveUpdates,
      systemStatus
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SUTRA_Intelligence_Report_${filterDomain}_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Dynamic Comparison Data based on filterDomain
  const getComparisonData = (node: GraphNode): ComparisonData | null => {
    if (node.type !== 'country' || node.id === 'India') return null;
    
    let metricName = 'GDP Nominal (USD)';
    let indiaVal = 3.75;
    let targetVal = parseFloat(node.metadata?.gdp?.replace('T', '') || '0');
    let unit = 'T';

    if (filterDomain === 'Energy') {
      metricName = 'Renewable Capacity';
      indiaVal = 180.5; // GW
      // For countries, we simulate their renewable capacity if not in metadata
      targetVal = node.id === 'China' ? 1200 : node.id === 'USA' ? 450 : node.id === 'Germany' ? 150 : 80;
      unit = 'GW';
    } else if (filterDomain === 'Tech') {
      metricName = 'Tech Innovation Index';
      indiaVal = 84.2;
      targetVal = node.id === 'USA' ? 98.5 : node.id === 'China' ? 92.1 : node.id === 'Japan' ? 95.4 : 78.2;
      unit = '/100';
    } else if (filterDomain === 'Trade') {
      metricName = 'Trade Balance';
      indiaVal = -20.5;
      targetVal = parseFloat(node.metadata?.trade_balance?.replace('B', '').replace('+', '') || '0');
      unit = 'B';
    } else if (filterDomain === 'Finance') {
      metricName = 'Forex Reserves';
      indiaVal = 640.2;
      targetVal = parseFloat(node.metadata?.forex?.replace('B', '').replace('T', '000') || '0');
      unit = 'B';
    }

    const leaning = 50 + ((indiaVal - targetVal) / (indiaVal + targetVal || 1)) * 50;

    return {
      metric: metricName,
      indiaValue: indiaVal,
      targetValue: targetVal,
      unit: unit,
      advantage: indiaVal > targetVal ? 'india' : 'target',
      leaning: Math.max(10, Math.min(90, leaning))
    };
  };

  const comparison = selectedNode ? getComparisonData(selectedNode) : null;

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Tricolor Top Bar */}
      <div className="tricolor-strip" />

      {/* Top Navigation Bar */}
      <nav className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
              <Shield size={28} className="text-[#000080]" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Government of India</div>
              <div className="text-xl font-extrabold tracking-tight text-[#000080] leading-none uppercase">Project Sutra <span className="text-[#FF9933]">2.0</span></div>
            </div>
          </div>
          
          <div className="h-10 w-px bg-slate-200" />
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2 text-slate-600 hover:text-[#000080] transition-colors cursor-pointer group">
              <Network size={16} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Knowledge Graph</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 hover:text-[#000080] transition-colors cursor-pointer group">
              <Database size={16} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Data Repository</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 hover:text-[#000080] transition-colors cursor-pointer group">
              <Activity size={16} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Live Analytics</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Intelligence Database..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[12px] w-80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#000080]/10 focus:border-[#000080] transition-all placeholder:text-slate-400"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[100]">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Search Results</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div 
                      key={result.id}
                      onClick={() => {
                        setSelectedNode(result);
                        setSearchTerm('');
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#000080] transition-colors">{result.id}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-tighter">{result.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-emerald-600">{(result as any).score * 100}%</div>
                        <div className="text-[8px] text-slate-400 uppercase">Relevance</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold text-slate-900 leading-none mb-1">Debanjan Mondal</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Senior Intelligence Analyst</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-[#000080] transition-colors cursor-pointer overflow-hidden">
              <Globe size={20} />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Intelligence Feed & Comparison */}
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden hidden xl:flex z-20 shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-[#000080] uppercase tracking-wider">Strategic Intelligence</h2>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${
                  filterDomain === 'All' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#000080]/5 border-[#000080]/10 text-[#000080]'
                }`}>
                  {filterDomain === 'All' ? 'Global' : filterDomain}
                </div>
              </div>
            </div>
            {selectedNode ? (
              <div className="space-y-4">
                {comparison && <TugOfWar data={comparison} targetCountry={selectedNode.id} />}
                <div className="h-40 w-full bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Historical Performance Index</p>
                    <span className="text-[9px] font-bold text-[#000080] uppercase">{selectedNode.id}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries?.history || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#000080" strokeWidth={2.5} dot={{ r: 2, fill: '#000080' }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-center p-6 bg-slate-50/50">
                <Globe size={32} className="text-slate-300 mb-3" />
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Intelligence Node</p>
                <p className="text-[10px] text-slate-400 mt-1">Select any node from the graph to view historical performance and comparative data</p>
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-b border-slate-100 bg-white">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-2 gap-3">
              {filterDomain === 'All' || filterDomain === 'Finance' ? (
                <>
                  <div 
                    onClick={() => setSelectedNode({ id: 'GDP Growth', type: 'metric', metadata: { value: '7.2', unit: '%', trend: 'up' } } as any)}
                    className={`p-3 rounded-xl border transition-all group cursor-pointer ${selectedNode?.id === 'GDP Growth' ? 'border-[#138808] bg-[#138808]/5 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-[#138808]/30'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">GDP Growth</div>
                    <div className="text-xl font-bold text-[#138808]">7.2%</div>
                  </div>
                  <div 
                    onClick={() => setSelectedNode({ id: 'Forex Reserves', type: 'metric', metadata: { value: '640.2', unit: 'B', trend: 'up' } } as any)}
                    className={`p-3 rounded-xl border transition-all group cursor-pointer ${selectedNode?.id === 'Forex Reserves' ? 'border-[#000080] bg-[#000080]/5 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-[#000080]/30'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Forex Reserves</div>
                    <div className="text-xl font-bold text-[#000080]">$640.2B</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Inflation</div>
                    <div className="text-xl font-bold text-red-600">4.8%</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Debt to GDP</div>
                    <div className="text-xl font-bold text-blue-600">81.2%</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Tech' ? (
                <>
                  <div 
                    onClick={() => setSelectedNode({ id: 'Innovation Index', type: 'metric', metadata: { value: '84.2', unit: '', trend: 'up' } } as any)}
                    className={`p-3 rounded-xl border transition-all group cursor-pointer ${selectedNode?.id === 'Innovation Index' ? 'border-[#FF9933] bg-[#FF9933]/5 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-[#FF9933]/30'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Innovation Index</div>
                    <div className="text-xl font-bold text-[#FF9933]">84.2</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">AI Patents</div>
                    <div className="text-xl font-bold text-purple-600">1,200+</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Semiconductors</div>
                    <div className="text-xl font-bold text-blue-600">$12.5B</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Digital Stack</div>
                    <div className="text-xl font-bold text-emerald-600">90%</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Energy' ? (
                <>
                  <div 
                    onClick={() => setSelectedNode({ id: 'Renewable Cap', type: 'metric', metadata: { value: '180.5', unit: 'GW', trend: 'up' } } as any)}
                    className={`p-3 rounded-xl border transition-all group cursor-pointer ${selectedNode?.id === 'Renewable Cap' ? 'border-[#138808] bg-[#138808]/5 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-[#138808]/30'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Renewable Cap</div>
                    <div className="text-xl font-bold text-[#138808]">180.5 GW</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-red-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Oil Reliance</div>
                    <div className="text-xl font-bold text-red-600">85%</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Nuclear Power</div>
                    <div className="text-xl font-bold text-blue-600">6.7 GW</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Solar Efficiency</div>
                    <div className="text-xl font-bold text-emerald-600">22.5%</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Trade' ? (
                <>
                  <div 
                    onClick={() => setSelectedNode({ id: 'Trade Balance', type: 'metric', metadata: { value: '-20.5', unit: 'B', trend: 'down' } } as any)}
                    className={`p-3 rounded-xl border transition-all group cursor-pointer ${selectedNode?.id === 'Trade Balance' ? 'border-[#FF9933] bg-[#FF9933]/5 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-[#FF9933]/30'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Trade Balance</div>
                    <div className="text-xl font-bold text-[#FF9933]">-$20.5B</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#000080]/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">FDI Inflow</div>
                    <div className="text-xl font-bold text-[#000080]">$71.4B</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Supply Chain</div>
                    <div className="text-xl font-bold text-emerald-600">76 Idx</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-600/30 transition-all group">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Export Volume</div>
                    <div className="text-xl font-bold text-blue-600">$770.2B</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-50/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Intelligence Stream</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-700 uppercase">Live Feed</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {liveUpdates.length > 0 ? liveUpdates.map((update, i) => (
                <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#000080]/30 transition-all cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${update.type === 'METRIC_UPDATE' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {update.type === 'METRIC_UPDATE' ? <Activity size={12} /> : <Zap size={12} />}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-[#000080] transition-colors">{update.payload.metric || update.type}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-900">{update.payload.value}</span>
                    <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${parseFloat(update.payload.change) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {parseFloat(update.payload.change) >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(parseFloat(update.payload.change))}%
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <Clock size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Data Stream...</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">System Operational</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400">LATENCY: {systemStatus?.latency || '---'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Active Nodes</p>
                <p className="text-sm font-bold text-slate-900">{systemStatus?.nodes_active || '0'}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Data Integrity</p>
                <p className="text-sm font-bold text-slate-900">99.9%</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Graph Area */}
        <main className="flex-1 relative flex flex-col bg-white">
          {/* Subtle Dot Grid Background */}
          <div className="absolute inset-0 opacity-[0.4] pointer-events-none" 
            style={{ 
              backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }} 
          />
          
          {/* Analytical Header Bar */}
          <div className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between z-10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#000080]" />
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Geopolitical Knowledge Graph</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status:</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Region:</span>
                  <span className="text-[10px] font-bold text-[#000080] uppercase tracking-widest">Global</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter Domain:</span>
                <select 
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-900 focus:outline-none cursor-pointer uppercase"
                >
                  <option value="All">All Domains</option>
                  <option value="Finance">Finance</option>
                  <option value="Tech">Tech</option>
                  <option value="Energy">Energy</option>
                  <option value="Trade">Trade</option>
                </select>
              </div>
              
              <button 
                onClick={handleExport}
                className="text-[10px] font-bold text-slate-600 hover:text-[#000080] transition-colors uppercase tracking-widest flex items-center gap-1.5 ml-2 px-4 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
              >
                <BarChart3 size={14} />
                Generate Report
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-hidden">
            <D3Graph searchTerm={searchTerm} onNodeSelect={setSelectedNode} filterDomain={filterDomain} />
          </div>
        </main>
      </div>
    </div>
  );
}
