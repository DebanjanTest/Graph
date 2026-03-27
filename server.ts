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
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      history.push({
        date: d.toISOString().split('T')[0],
        rank: Math.floor(Math.random() * 10) + 1,
        value: Math.floor(Math.random() * 1000) + 500
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
          
          // Domains
          { id: "Finance", type: "domain", metadata: { description: "Banking, reserves, and capital markets." } },
          { id: "Trade", type: "domain", metadata: { description: "Import/Export and supply chains." } },
          { id: "Energy", type: "domain", metadata: { description: "Oil, gas, and renewables." } },
          { id: "Tech", type: "domain", metadata: { description: "Semiconductors, AI, and digital infrastructure." } },

          // Detailed Metrics
          { id: "Forex Reserves", type: "metric", domain: "Finance", metadata: { india_val: "640B", china_val: "3.2T", japan_val: "1.2T", why: "Strategic buffer against external shocks." } },
          { id: "GDP Growth", type: "metric", domain: "Finance", metadata: { india_val: "7.2%", usa_val: "2.1%", china_val: "5.0%", why: "Economic expansion rate." } },
          { id: "Inflation", type: "metric", domain: "Finance", metadata: { india_val: "4.8%", usa_val: "3.2%", germany_val: "2.5%", why: "Purchasing power stability." } },
          { id: "Interest Rates", type: "metric", domain: "Finance", metadata: { india_repo: "6.5%", usa_fed: "5.25%", why: "Cost of borrowing and liquidity control." } },
          { id: "Debt to GDP", type: "metric", domain: "Finance", metadata: { india_ratio: "81%", japan_ratio: "260%", usa_ratio: "120%", why: "Fiscal health indicator." } },
          { id: "Stock Market Cap", type: "metric", domain: "Finance", metadata: { india_val: "4.5T", usa_val: "50T", why: "Equity market depth." } },
          
          { id: "Semiconductors", type: "metric", domain: "Tech", metadata: { leader: "Taiwan/USA", india_focus: "Assembly/Design", why: "Critical for modern electronics and AI." } },
          { id: "AI Research", type: "metric", domain: "Tech", metadata: { leader: "USA/China", india_growth: "Exponential", patents_2024: "1200", why: "Future of productivity and defense." } },
          { id: "Digital Stack", type: "metric", domain: "Tech", metadata: { india_adoption: "90%", upi_volume: "12B/mo", why: "UPI/Aadhaar driving financial inclusion." } },
          { id: "Cyber Security", type: "metric", domain: "Tech", metadata: { global_threat_level: "High", india_readiness: "Moderate", why: "Protecting digital infrastructure." } },

          { id: "Renewable Capacity", type: "metric", domain: "Energy", metadata: { india_val: "180GW", china_val: "1200GW", usa_val: "450GW", germany_val: "150GW", why: "Energy transition and sustainability." } },
          { id: "Oil Reliance", type: "metric", domain: "Energy", metadata: { india_imports: "85%", usa_exporter: "Yes", china_imports: "70%", why: "Energy security vulnerability." } },
          { id: "Nuclear Power", type: "metric", domain: "Energy", metadata: { france_leader: "Yes", japan_restart: "Ongoing", usa_capacity: "95GW", why: "Baseload clean energy." } },
          { id: "Green Hydrogen", type: "metric", domain: "Energy", metadata: { india_mission: "5MMT", eu_target: "10MMT", why: "Decarbonizing heavy industry." } },
          { id: "Grid Stability", type: "metric", domain: "Energy", metadata: { status: "Critical", why: "Integration of intermittent renewables." } },

          { id: "Trade Balance", type: "metric", domain: "Trade", metadata: { china_surplus: "High", india_deficit: "Moderate", usa_deficit: "High", why: "Net export/import position." } },
          { id: "FDI Inflow", type: "metric", domain: "Trade", metadata: { india_val: "71B", target: "100B", china_val: "180B", why: "Attraction of global manufacturing." } },
          { id: "Supply Chain", type: "metric", domain: "Trade", metadata: { resilience: "Critical", china_plus_one: "Active", why: "Diversification away from single-source reliance." } },
          { id: "Tariff Rates", type: "metric", domain: "Trade", metadata: { global_avg: "9%", india_avg: "14%", why: "Protectionism vs Free Trade." } },
          { id: "Logistics Index", type: "metric", domain: "Trade", metadata: { india_rank: "38", singapore_rank: "1", why: "Efficiency of goods movement." } },
          { id: "Export Volume", type: "metric", domain: "Trade", metadata: { india_target: "2T", current: "770B", why: "Global market share." } },
          { id: "Trade Corridors", type: "metric", domain: "Trade", metadata: { imec: "Proposed", why: "Strategic connectivity routes." } }
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
          
          { source: "Tech", target: "Semiconductors", type: "measures" },
          { source: "Tech", target: "AI Research", type: "measures" },
          { source: "Tech", target: "Digital Stack", type: "measures" },
          { source: "Tech", target: "Cyber Security", type: "measures" },

          { source: "Energy", target: "Renewable Capacity", type: "measures" },
          { source: "Energy", target: "Oil Reliance", type: "measures" },
          { source: "Energy", target: "Nuclear Power", type: "measures" },
          { source: "Energy", target: "Green Hydrogen", type: "measures" },
          { source: "Energy", target: "Grid Stability", type: "measures" },

          { source: "Trade", target: "Trade Balance", type: "measures" },
          { source: "Trade", target: "FDI Inflow", type: "measures" },
          { source: "Trade", target: "Supply Chain", type: "measures" },
          { source: "Trade", target: "Tariff Rates", type: "measures" },
          { source: "Trade", target: "Logistics Index", type: "measures" },
          { source: "Trade", target: "Export Volume", type: "measures" },
          { source: "Trade", target: "Trade Corridors", type: "measures" },

          // Countries to Domains (to show they are also in these fields)
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
          { source: "Japan", target: "Trade", type: "measures" }
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
