
import { Currency } from '../types';

export const USD_TO_PLN_RATE = 4.05;

export const copperToCurrency = (totalCopper: number): Currency => {
  const gold = Math.floor(totalCopper / 10000);
  const silver = Math.floor((totalCopper % 10000) / 100);
  const copper = Math.floor(totalCopper % 100);
  return { gold, silver, copper };
};

export const currencyToCopper = (gold: number, silver: number, copper: number): number => {
  return (gold * 10000) + (silver * 100) + copper;
};

export const formatCurrency = (totalCopper: number): string => {
  const { gold, silver, copper } = copperToCurrency(totalCopper);
  const parts = [];
  if (gold > 0) parts.push(`${gold}з`);
  if (silver > 0) parts.push(`${silver}с`);
  if (copper > 0 || (gold === 0 && silver === 0)) parts.push(`${copper}м`);
  return parts.join(' ');
};

export const formatPLN = (usd: number): string => {
  const pln = usd * USD_TO_PLN_RATE;
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(pln);
};
