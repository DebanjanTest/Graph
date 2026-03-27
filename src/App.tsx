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
      indiaVal = 180; // GW
      targetVal = node.id === 'China' ? 1200 : node.id === 'USA' ? 450 : 150;
      unit = 'GW';
    } else if (filterDomain === 'Tech') {
      metricName = 'Tech Innovation Index';
      indiaVal = 65;
      targetVal = node.id === 'USA' ? 98 : node.id === 'China' ? 92 : 75;
      unit = '/100';
    } else if (filterDomain === 'Trade') {
      metricName = 'Trade Balance';
      indiaVal = -20;
      targetVal = parseFloat(node.metadata?.trade_balance?.replace('B', '') || '0');
      unit = 'B';
    } else if (filterDomain === 'Finance') {
      metricName = 'Forex Reserves';
      indiaVal = 640;
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
    <div className="h-screen bg-[#F1F5F9] text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between z-50 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Intelligence</div>
              <div className="text-xl font-black tracking-tighter text-white leading-none">SUTRA <span className="text-blue-500">OS</span></div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-800" />
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer group">
              <Network size={16} className="group-hover:text-blue-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Ontology</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer group">
              <Database size={16} className="group-hover:text-amber-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Datasets</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer group">
              <Activity size={16} className="group-hover:text-emerald-500 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Vector Search (e.g. 'high growth countries')..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-[11px] w-96 text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-600"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[100]">
                <div className="p-2 border-b border-slate-800 bg-slate-800/30">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Semantic Matches</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div 
                      key={result.id}
                      onClick={() => {
                        setSelectedNode(result);
                        setSearchTerm('');
                      }}
                      className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center group border-b border-slate-800/50 last:border-0"
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{result.id}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-tighter">{result.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-emerald-500">{(result as any).score * 100}%</div>
                        <div className="text-[8px] text-slate-600 uppercase">Match</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-white leading-none mb-1">Debanjan Mondal</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Senior Analyst</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
              <Globe size={18} />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Intelligence Feed & Comparison */}
        <aside className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden hidden xl:flex">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strategic Comparison</h2>
            {selectedNode && comparison ? (
              <div className="space-y-4">
                <TugOfWar data={comparison} targetCountry={selectedNode.id} />
                <div className="h-40 w-full bg-slate-900 rounded-xl p-2 border border-slate-800">
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-2 px-2">Historical Ranking Trend</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries?.history || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis reversed hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Line type="monotone" dataKey="rank" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-center p-6">
                <Globe size={32} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a Country Node</p>
                <p className="text-[10px] text-slate-400 mt-1">To initiate bilateral comparison</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strategic Metrics</h2>
            <div className="grid grid-cols-2 gap-3">
              {filterDomain === 'All' || filterDomain === 'Finance' ? (
                <>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">GDP Growth</div>
                    <div className="text-sm font-black text-emerald-600">7.2%</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Forex Reserves</div>
                    <div className="text-sm font-black text-blue-600">$640B</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Tech' ? (
                <>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Tech Index</div>
                    <div className="text-sm font-black text-amber-600">84.2</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">AI Patents</div>
                    <div className="text-sm font-black text-purple-600">1,200+</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Energy' ? (
                <>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Renewable Cap</div>
                    <div className="text-sm font-black text-emerald-600">180 GW</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Oil Reliance</div>
                    <div className="text-sm font-black text-red-600">85%</div>
                  </div>
                </>
              ) : null}
              {filterDomain === 'Trade' ? (
                <>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Trade Balance</div>
                    <div className="text-sm font-black text-amber-600">-$12B</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">FDI Inflow</div>
                    <div className="text-sm font-black text-blue-600">$71B</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Intelligence Stream</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-600 uppercase">Live</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {liveUpdates.length > 0 ? liveUpdates.map((update, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${update.type === 'METRIC_UPDATE' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        {update.type === 'METRIC_UPDATE' ? <Activity size={12} /> : <Zap size={12} />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-900">{update.payload.metric || update.type}</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-400">{new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{update.payload.value}</span>
                    <div className={`flex items-center text-[10px] font-bold ${parseFloat(update.payload.change) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {parseFloat(update.payload.change) >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(parseFloat(update.payload.change))}%
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Clock size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Stream Data...</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUTRA Core Active</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500">LATENCY: {systemStatus?.latency || '---'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Active Nodes</p>
                <p className="text-xs font-black text-white">{systemStatus?.nodes_active || '0'}</p>
              </div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Uptime</p>
                <p className="text-xs font-black text-white">99.99%</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Graph Area */}
        <main className="flex-1 relative flex flex-col bg-slate-50">
          {/* Analytical Header Bar */}
          <div className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Global Ontology Intelligence</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Operational</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sync:</span>
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Real-time</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">View Filter:</span>
                <select 
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-slate-900 focus:outline-none cursor-pointer uppercase tracking-wider"
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
                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center gap-1.5 ml-2"
              >
                <BarChart3 size={12} />
                Export Report
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
