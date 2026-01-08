
import { NodeInfo } from './types';

export const STORAGE_KEY = 'aoc_trade_history_v2';
export const EXPENSES_STORAGE_KEY = 'aoc_expenses_v1';
export const COIN_SALES_STORAGE_KEY = 'aoc_coin_sales_v1';
export const SHIFTS_STORAGE_KEY = 'aoc_shifts_v1';
export const NODES_STORAGE_KEY = 'aoc_nodes_list_v2';
export const SCHEMA_VERSION_KEY = 'aoc_db_schema_version';
export const CURRENT_SCHEMA_VERSION = '2.5';

// Статичный список городов Alpha 2
export const DEFAULT_NODES: NodeInfo[] = [
  { id: 'n1', name: 'Aithanahr', region: 'Alpha 2' },
  { id: 'n2', name: 'Arisalon', region: 'Alpha 2' },
  { id: 'n3', name: 'Azmaran', region: 'Alpha 2' },
  { id: 'n4', name: 'Brinebarrel', region: 'Alpha 2' },
  { id: 'n5', name: 'Dhurgrum', region: 'Alpha 2' },
  { id: 'n6', name: 'Djinna', region: 'Alpha 2' },
  { id: 'n7', name: 'Duunhold', region: 'Alpha 2' },
  { id: 'n8', name: 'Halcyon', region: 'Alpha 2' },
  { id: 'n9', name: 'Hecribba', region: 'Alpha 2' },
  { id: 'n10', name: 'Joeva', region: 'Alpha 2' },
  { id: 'n11', name: 'Kal Torhum', region: 'Alpha 2' },
  { id: 'n12', name: 'Korrin', region: 'Alpha 2' },
  { id: 'n13', name: 'Miraleth', region: 'Alpha 2' },
  { id: 'n14', name: 'Mythbreak', region: 'Alpha 2' },
  { id: 'n15', name: 'New Aela', region: 'Alpha 2' },
  { id: 'n16', name: 'Seahook', region: 'Alpha 2' },
  { id: 'n17', name: 'Shorefoot', region: 'Alpha 2' },
  { id: 'n18', name: "Squall's End", region: 'Alpha 2' },
  { id: 'n19', name: 'Sunhaven', region: 'Alpha 2' },
  { id: 'n20', name: 'Tangled Post', region: 'Alpha 2' },
  { id: 'n21', name: 'Vexhelm', region: 'Alpha 2' },
  { id: 'n22', name: 'Vhalgadim', region: 'Alpha 2' },
  { id: 'n23', name: 'Vinebreach', region: 'Alpha 2' },
  { id: 'n24', name: 'Wildport', region: 'Alpha 2' },
  { id: 'n25', name: 'Windansea', region: 'Alpha 2' },
  { id: 'n26', name: 'Winstead', region: 'Alpha 2' }
].sort((a, b) => a.name.localeCompare(b.name));
