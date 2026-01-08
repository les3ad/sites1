
export type PackType = 'basic' | 'luxury' | 'rare' | 'quest';

/**
 * Interface representing currency values in gold, silver, and copper.
 */
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

/**
 * Interface representing an active trade trip.
 */
export interface ActiveTrip {
  startTime: string;
  fromNode: string;
  toNode: string;
  packsCount: number;
  packType: PackType;
}

/**
 * Interface for route statistics and performance.
 */
export interface RouteStats {
  route: string;
  from: string;
  to: string;
  totalProfit: number;
  count: number;
  totalPacks: number;
  avgProfit: number;
  avgDuration: number;
  efficiencyIndex: number;
  lastUsed: string;
}

export interface TradeRecord {
  id: string;
  fromNode: string;
  toNode: string;
  packsCount: number;
  packType?: PackType;
  pricePerPack: number; // in copper
  profit: number; // Total profit (packsCount * pricePerPack)
  timestamp: string; // ISO string
  type: 'sale';
  durationMinutes?: number; // Time taken for the trip
}

export interface ExpenseRecord {
  id: string;
  label: string;
  amount: number; // in copper
  timestamp: string; // ISO string
  type: 'expense';
}

export interface CoinSaleRecord {
  id: string;
  amount: number; // amount of copper sold
  usdPrice: number; // price in USD
  timestamp: string;
  type: 'coin_sale';
}

export interface IdleRecord {
  id: string;
  timestamp: string;
  reason: string;
  durationMinutes?: number;
}

export interface ShiftRecord {
  id: string;
  startTime: string;
  endTime: string;
  startingBalance: number;
  endingBalance: number;
  totalProfit: number;
  totalExpenses: number;
  totalCoinSales: number;
  tradesCount: number;
  netProfit: number;
}

export interface AppLog {
  id: string;
  msg: string;
  type: 'info' | 'success' | 'error' | 'warning';
  time: string;
}

export type ActivityRecord = TradeRecord | ExpenseRecord | CoinSaleRecord;

export interface NodeInfo {
  id: string;
  name: string;
  region: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
}
