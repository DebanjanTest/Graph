export enum NodeType {
  COUNTRY = 'country',
  DOMAIN = 'domain',
  METRIC = 'metric'
}

export enum LinkType {
  RANKS_ABOVE = 'ranks_above',
  RANKS_BELOW = 'ranks_below',
  COMPETES_WITH = 'competes_with',
  MEASURES = 'measures'
}

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface TimeSeriesPoint {
  date: string;
  rank: number;
  value: number;
}

export interface TimeSeriesData {
  nodeId: string;
  history: TimeSeriesPoint[];
}

export interface ComparisonData {
  metric: string;
  indiaValue: number;
  targetValue: number;
  unit: string;
  advantage: 'india' | 'target' | 'neutral';
  leaning: number; // 0 to 100, 50 is neutral
}

export interface LiveUpdate {
  type: 'METRIC_UPDATE' | 'NEWS_FEED' | 'SYSTEM_STATUS';
  payload: any;
  timestamp: string;
}
