import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;
  const DATA_PATH = path.join(process.cwd(), "data", "knowledge-graph.json");

  app.use(cors());
  app.use(bodyParser.json());

  // Ensure data directory exists
  if (!fs.existsSync(path.join(process.cwd(), "data"))) {
    fs.mkdirSync(path.join(process.cwd(), "data"));
  }

  // --- MOCK DATABASES ---
  
  // 1. Vector DB Simulation (Semantic Search)
  const vectorSearch = (query: string, nodes: any[]) => {
    const q = query.toLowerCase();
    return nodes.filter(n => 
      n.id.toLowerCase().includes(q) || 
      (n.metadata?.description && n.metadata.description.toLowerCase().includes(q)) ||
      (n.type && n.type.toLowerCase().includes(q))
    ).map(n => ({
      ...n,
      score: n.id.toLowerCase() === q ? 1 : 0.8 // Simple scoring
    })).sort((a, b) => b.score - a.score);
  };

  // 2. Time Series DB Simulation (Rankings over time)
  const getTimeSeries = (nodeId: string) => {
    const history = [];
    const now = new Date();
    
    // Seed based on nodeId for consistent-ish random data
    let seed = 0;
    for (let i = 0; i < nodeId.length; i++) seed += nodeId.charCodeAt(i);
    
    let baseValue = 50 + (seed % 40); // Base value between 50 and 90
    
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      
      // Add some volatility and a slight upward trend for India
      const volatility = (Math.random() - 0.45) * 5; 
      const trend = nodeId === 'India' ? (12 - i) * 0.5 : 0;
      baseValue = Math.max(10, Math.min(100, baseValue + volatility + trend));

      history.push({
        date: d.toISOString().split('T')[0],
        rank: Math.floor(Math.random() * 5) + 1, // Rank 1-5
        value: parseFloat(baseValue.toFixed(2))
      });
    }
    return { nodeId, history };
  };

  // --- API ROUTES ---

  app.get("/api/knowledge-graph", (req, res) => {
    if (fs.existsSync(DATA_PATH)) {
      const data = fs.readFileSync(DATA_PATH, "utf-8");
      res.json(JSON.parse(data));
    } else {
      // ... (Initial data logic remains same as before)
      const initialData = {
        nodes: [
          // Countries
          { id: "India", type: "country", metadata: { description: "5th largest economy, projected 3rd by 2030.", region: "South Asia", gdp: "3.75T", growth: "7.2%", inflation: "4.8%", forex: "640B", tech_index: "High", energy_mix: "Coal/Renewables", trade_balance: "-20B" } },
          { id: "USA", type: "country", metadata: { description: "Global reserve currency issuer.", region: "North America", gdp: "26.9T", growth: "2.1%", inflation: "3.2%", forex: "250B", tech_index: "Elite", energy_mix: "Gas/Oil/Renewables", trade_balance: "-60B" } },
          { id: "China", type: "country", metadata: { description: "Manufacturing hub, massive trade surplus.", region: "East Asia", gdp: "17.7T", growth: "5.0%", inflation: "0.7%", forex: "3.2T", tech_index: "Elite", energy_mix: "Coal/Renewables", trade_balance: "+80B" } },
          { id: "Germany", type: "country", metadata: { description: "Europe's industrial powerhouse.", region: "Europe", gdp: "4.4T", growth: "0.3%", inflation: "2.5%", forex: "300B", tech_index: "High", energy_mix: "Renewables/Gas", trade_balance: "+20B" } },
          { id: "Japan", type: "country", metadata: { description: "Advanced tech, high debt-to-GDP.", region: "East Asia", gdp: "4.2T", growth: "1.0%", inflation: "2.2%", forex: "1.2T", tech_index: "High", energy_mix: "Nuclear/Gas", trade_balance: "+5B" } },
          { id: "UK", type: "country", metadata: { description: "Global financial hub.", region: "Europe", gdp: "3.1T", growth: "0.5%", inflation: "3.4%", forex: "180B", tech_index: "High", energy_mix: "Gas/Wind", trade_balance: "-15B" } },
          { id: "France", type: "country", metadata: { description: "Nuclear energy leader in Europe.", region: "Europe", gdp: "2.9T", growth: "0.7%", inflation: "2.9%", forex: "240B", tech_index: "High", energy_mix: "Nuclear/Renewables", trade_balance: "-10B" } },
          { id: "Russia", type: "country", metadata: { description: "Major energy exporter.", region: "Eurasia", gdp: "2.0T", growth: "1.5%", inflation: "7.4%", forex: "580B", tech_index: "Moderate", energy_mix: "Gas/Oil", trade_balance: "+40B" } },
          { id: "UAE", type: "country", metadata: { description: "Strategic trade and energy hub.", region: "Middle East", gdp: "0.5T", growth: "3.5%", inflation: "2.1%", forex: "150B", tech_index: "High", energy_mix: "Oil/Solar", trade_balance: "+30B" } },
          { id: "Saudi Arabia", type: "country", metadata: { description: "Largest oil exporter.", region: "Middle East", gdp: "1.1T", growth: "0.8%", inflation: "1.6%", forex: "450B", tech_index: "Moderate", energy_mix: "Oil/Gas", trade_balance: "+50B" } },
          
          // Domains
          { id: "Finance", type: "domain", metadata: { description: "Banking, reserves, and capital markets." } },
          { id: "Trade", type: "domain", metadata: { description: "Import/Export and supply chains." } },
          { id: "Energy", type: "domain", metadata: { description: "Oil, gas, and renewables." } },
          { id: "Tech", type: "domain", metadata: { description: "Semiconductors, AI, and digital infrastructure." } },

          // Detailed Metrics
          { id: "Forex Reserves", type: "metric", domain: "Finance", metadata: { value: "640.2", unit: "B", trend: "up", description: "Strategic buffer against external shocks." } },
          { id: "GDP Growth", type: "metric", domain: "Finance", metadata: { value: "7.2", unit: "%", trend: "up", description: "Economic expansion rate." } },
          { id: "Inflation", type: "metric", domain: "Finance", metadata: { value: "4.8", unit: "%", trend: "down", description: "Purchasing power stability." } },
          { id: "Interest Rates", type: "metric", domain: "Finance", metadata: { value: "6.5", unit: "%", trend: "stable", description: "Cost of borrowing and liquidity control." } },
          { id: "Debt to GDP", type: "metric", domain: "Finance", metadata: { value: "81.2", unit: "%", trend: "down", description: "Fiscal health indicator." } },
          { id: "Stock Market Cap", type: "metric", domain: "Finance", metadata: { value: "4.5", unit: "T", trend: "up", description: "Equity market depth." } },
          { id: "Capital Adequacy", type: "metric", domain: "Finance", metadata: { value: "16.1", unit: "%", trend: "up", description: "Banking sector resilience." } },
          { id: "Fiscal Deficit", type: "metric", domain: "Finance", metadata: { value: "5.8", unit: "%", trend: "down", description: "Government spending gap." } },
          
          { id: "Semiconductors", type: "metric", domain: "Tech", metadata: { value: "12.5", unit: "B", trend: "up", description: "Critical for modern electronics and AI." } },
          { id: "AI Research", type: "metric", domain: "Tech", metadata: { value: "1200", unit: "Pats", trend: "up", description: "Future of productivity and defense." } },
          { id: "Digital Stack", type: "metric", domain: "Tech", metadata: { value: "90", unit: "%", trend: "up", description: "UPI/Aadhaar driving financial inclusion." } },
          { id: "Cyber Security", type: "metric", domain: "Tech", metadata: { value: "82", unit: "Idx", trend: "up", description: "Protecting digital infrastructure." } },
          { id: "5G Adoption", type: "metric", domain: "Tech", metadata: { value: "450", unit: "Cities", trend: "up", description: "Next-gen connectivity rollout." } },
          { id: "SaaS Exports", type: "metric", domain: "Tech", metadata: { value: "32", unit: "B", trend: "up", description: "Software as a Service global reach." } },

          { id: "Renewable Capacity", type: "metric", domain: "Energy", metadata: { value: "180.5", unit: "GW", trend: "up", description: "Energy transition and sustainability." } },
          { id: "Oil Reliance", type: "metric", domain: "Energy", metadata: { value: "85", unit: "%", trend: "down", description: "Energy security vulnerability." } },
          { id: "Nuclear Power", type: "metric", domain: "Energy", metadata: { value: "6.7", unit: "GW", trend: "up", description: "Baseload clean energy." } },
          { id: "Green Hydrogen", type: "metric", domain: "Energy", metadata: { value: "5.0", unit: "MMT", trend: "up", description: "Decarbonizing heavy industry." } },
          { id: "Grid Stability", type: "metric", domain: "Energy", metadata: { value: "94", unit: "%", trend: "up", description: "Integration of intermittent renewables." } },
          { id: "Solar Efficiency", type: "metric", domain: "Energy", metadata: { value: "22.5", unit: "%", trend: "up", description: "Photovoltaic conversion rate." } },

          { id: "Trade Balance", type: "metric", domain: "Trade", metadata: { value: "-20.5", unit: "B", trend: "up", description: "Net export/import position." } },
          { id: "FDI Inflow", type: "metric", domain: "Trade", metadata: { value: "71.4", unit: "B", trend: "up", description: "Attraction of global manufacturing." } },
          { id: "Supply Chain", type: "metric", domain: "Trade", metadata: { value: "76", unit: "Idx", trend: "up", description: "Diversification away from single-source reliance." } },
          { id: "Tariff Rates", type: "metric", domain: "Trade", metadata: { value: "14.2", unit: "%", trend: "down", description: "Protectionism vs Free Trade." } },
          { id: "Logistics Index", type: "metric", domain: "Trade", metadata: { value: "38", unit: "Rnk", trend: "up", description: "Efficiency of goods movement." } },
          { id: "Export Volume", type: "metric", domain: "Trade", metadata: { value: "770.2", unit: "B", trend: "up", description: "Global market share." } },
          { id: "Trade Corridors", type: "metric", domain: "Trade", metadata: { value: "4", unit: "Active", trend: "up", description: "Strategic connectivity routes." } },
          { id: "Port Efficiency", type: "metric", domain: "Trade", metadata: { value: "24", unit: "Hrs", trend: "down", description: "Vessel turnaround time." } }
        ],
        links: [
          // Structural Links (India to Domains)
          { source: "India", target: "Finance", type: "measures" },
          { source: "India", target: "Trade", type: "measures" },
          { source: "India", target: "Energy", type: "measures" },
          { source: "India", target: "Tech", type: "measures" },
          
          // Domain to Metrics
          { source: "Finance", target: "Forex Reserves", type: "measures" },
          { source: "Finance", target: "GDP Growth", type: "measures" },
          { source: "Finance", target: "Inflation", type: "measures" },
          { source: "Finance", target: "Interest Rates", type: "measures" },
          { source: "Finance", target: "Debt to GDP", type: "measures" },
          { source: "Finance", target: "Stock Market Cap", type: "measures" },
          { source: "Finance", target: "Capital Adequacy", type: "measures" },
          { source: "Finance", target: "Fiscal Deficit", type: "measures" },
          
          { source: "Tech", target: "Semiconductors", type: "measures" },
          { source: "Tech", target: "AI Research", type: "measures" },
          { source: "Tech", target: "Digital Stack", type: "measures" },
          { source: "Tech", target: "Cyber Security", type: "measures" },
          { source: "Tech", target: "5G Adoption", type: "measures" },
          { source: "Tech", target: "SaaS Exports", type: "measures" },

          { source: "Energy", target: "Renewable Capacity", type: "measures" },
          { source: "Energy", target: "Oil Reliance", type: "measures" },
          { source: "Energy", target: "Nuclear Power", type: "measures" },
          { source: "Energy", target: "Green Hydrogen", type: "measures" },
          { source: "Energy", target: "Grid Stability", type: "measures" },
          { source: "Energy", target: "Solar Efficiency", type: "measures" },

          { source: "Trade", target: "Trade Balance", type: "measures" },
          { source: "Trade", target: "FDI Inflow", type: "measures" },
          { source: "Trade", target: "Supply Chain", type: "measures" },
          { source: "Trade", target: "Tariff Rates", type: "measures" },
          { source: "Trade", target: "Logistics Index", type: "measures" },
          { source: "Trade", target: "Export Volume", type: "measures" },
          { source: "Trade", target: "Trade Corridors", type: "measures" },
          { source: "Trade", target: "Port Efficiency", type: "measures" },

          // Countries to Domains
          { source: "USA", target: "Finance", type: "measures" },
          { source: "USA", target: "Tech", type: "measures" },
          { source: "USA", target: "Energy", type: "measures" },
          { source: "USA", target: "Trade", type: "measures" },

          { source: "China", target: "Finance", type: "measures" },
          { source: "China", target: "Tech", type: "measures" },
          { source: "China", target: "Energy", type: "measures" },
          { source: "China", target: "Trade", type: "measures" },

          { source: "Germany", target: "Finance", type: "measures" },
          { source: "Germany", target: "Tech", type: "measures" },
          { source: "Germany", target: "Energy", type: "measures" },
          { source: "Germany", target: "Trade", type: "measures" },

          { source: "Japan", target: "Finance", type: "measures" },
          { source: "Japan", target: "Tech", type: "measures" },
          { source: "Japan", target: "Energy", type: "measures" },
          { source: "Japan", target: "Trade", type: "measures" },

          { source: "UK", target: "Finance", type: "measures" },
          { source: "UK", target: "Tech", type: "measures" },
          { source: "UK", target: "Trade", type: "measures" },

          { source: "France", target: "Energy", type: "measures" },
          { source: "France", target: "Tech", type: "measures" },

          { source: "Russia", target: "Energy", type: "measures" },
          { source: "Russia", target: "Trade", type: "measures" },

          { source: "UAE", target: "Energy", type: "measures" },
          { source: "UAE", target: "Trade", type: "measures" },

          { source: "Saudi Arabia", target: "Energy", type: "measures" },
          { source: "Saudi Arabia", target: "Finance", type: "measures" }
        ]
      };
      fs.writeFileSync(DATA_PATH, JSON.stringify(initialData, null, 2));
      res.json(initialData);
    }
  });

  app.get("/api/search", (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    const results = vectorSearch(query, data.nodes);
    res.json(results);
  });

  app.get("/api/timeseries/:id", (req, res) => {
    res.json(getTimeSeries(req.params.id));
  });

  // --- WEBSOCKET LOGIC ---

  wss.on("connection", (ws) => {
    console.log("Client connected to SUTRA Live Stream");
    
    // Send initial status
    ws.send(JSON.stringify({
      type: 'SYSTEM_STATUS',
      payload: { status: 'CONNECTED', latency: '12ms', nodes_active: 42 },
      timestamp: new Date().toISOString()
    }));

    // Simulate live metric updates
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const metrics = ['Forex Reserves', 'GDP Growth', 'Trade Volume'];
        const metric = metrics[Math.floor(Math.random() * metrics.length)];
        ws.send(JSON.stringify({
          type: 'METRIC_UPDATE',
          payload: { 
            metric, 
            value: (Math.random() * 100).toFixed(2), 
            change: (Math.random() * 2 - 1).toFixed(2) 
          },
          timestamp: new Date().toISOString()
        }));
      }
    }, 5000);

    ws.on("close", () => clearInterval(interval));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SUTRA OS running on http://localhost:${PORT}`);
  });
}

startServer();
