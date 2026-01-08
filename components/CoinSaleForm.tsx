
import React, { useState } from 'react';
import { CoinSaleRecord } from '../types';
import { currencyToCopper, formatCurrency } from '../utils/currency';
import { DollarSign, Coins, PlusCircle, TrendingDown, Wallet } from 'lucide-react';

interface CoinSaleFormProps {
  onAddCoinSale: (sale: CoinSaleRecord) => void;
  currentBalance: number;
}

const CoinSaleForm: React.FC<CoinSaleFormProps> = ({ onAddCoinSale, currentBalance }) => {
  const [gold, setGold] = useState<string>('');
  const [silver, setSilver] = useState<string>('');
  const [copper, setCopper] = useState<string>('');
  const [usdPrice, setUsdPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = currencyToCopper(Number(gold) || 0, Number(silver) || 0, Number(copper) || 0);
    const price = Number(usdPrice) || 0;

    if (amount <= 0 || price <= 0) {
      alert("Укажите количество монет и цену в USD.");
      return;
    }

    if (amount > currentBalance) {
      alert("У вас недостаточно монет в кошельке для продажи такого количества.");
      return;
    }

    setIsSubmitting(true);
    const newSale: CoinSaleRecord = {
      id: crypto.randomUUID(),
      amount,
      usdPrice: price,
      timestamp: new Date().toISOString(),
      type: 'coin_sale',
    };

    onAddCoinSale(newSale);
    setGold(''); setSilver(''); setCopper(''); setUsdPrice('');
    setTimeout(() => setIsSubmitting(false), 600);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-50"></div>
      
      <div className="flex justify-between items-start mb-8">
        <h2 className="text-2xl font-black flex items-center gap-3 text-white uppercase italic tracking-tighter">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <DollarSign className="text-emerald-500" size={24} />
          </div>
          Продажа Валюты
        </h2>
        <div className="flex flex-col items-end opacity-60 text-right">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Доступно</span>
          <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
            <Wallet size={10} /> {formatCurrency(currentBalance)}
          </span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            Сколько монет продаем?
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <input type="number" value={gold} onChange={(e) => setGold(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pr-8 text-white font-black outline-none focus:ring-2 focus:ring-amber-500/50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 font-black">G</span>
            </div>
            <div className="relative">
              <input type="number" value={silver} onChange={(e) => setSilver(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pr-8 text-white font-black outline-none focus:ring-2 focus:ring-slate-400/50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">S</span>
            </div>
            <div className="relative">
              <input type="number" value={copper} onChange={(e) => setCopper(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pr-8 text-white font-black outline-none focus:ring-2 focus:ring-orange-600/50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-700 font-black">C</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            Цена продажи (USD)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={usdPrice}
              onChange={(e) => setUsdPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-10 text-emerald-400 font-black text-xl outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={20} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || currentBalance === 0}
          className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
        >
          {isSubmitting ? 'Выполняем экспорт...' : 'Зафиксировать продажу ($)'}
        </button>
      </form>
    </div>
  );
};

export default CoinSaleForm;
