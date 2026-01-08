
import React, { useState } from 'react';
import { ExpenseRecord } from '../types';
import { currencyToCopper, formatCurrency } from '../utils/currency';
import { ShoppingCart, Wallet, ArrowDown, Wrench, Zap, ShieldCheck } from 'lucide-react';

interface PurchaseFormProps {
  onAddExpense: (expense: ExpenseRecord) => void;
  currentBalance: number;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onAddExpense, currentBalance }) => {
  const [label, setLabel] = useState('');
  const [remGold, setRemGold] = useState<string>('');
  const [remSilver, setRemSilver] = useState<string>('');
  const [remCopper, setRemCopper] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presets = [
    { name: 'Ремонт', icon: Wrench },
    { name: 'Налог', icon: ShieldCheck },
    { name: 'Расходка', icon: Zap },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const remTotal = currencyToCopper(Number(remGold) || 0, Number(remSilver) || 0, Number(remCopper) || 0);
    const amountSpent = currentBalance - remTotal;

    if (amountSpent <= 0) return;

    setIsSubmitting(true);
    onAddExpense({
      id: crypto.randomUUID(),
      label: label.trim() || 'Закупка',
      amount: amountSpent,
      timestamp: new Date().toISOString(),
      type: 'expense',
    });
    setRemGold(''); setRemSilver(''); setRemCopper(''); setLabel('');
    setTimeout(() => setIsSubmitting(false), 600);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/0 via-rose-500 to-rose-500/0 opacity-50"></div>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
          <ShoppingCart className="text-rose-500" size={24} /> Траты
        </h2>
        <div className="flex gap-1">
          {presets.map(p => (
            <button key={p.name} type="button" onClick={() => setLabel(p.name)} className="px-2 py-1 bg-slate-800 rounded-lg text-[8px] font-black text-slate-400 hover:text-white transition-all uppercase flex items-center gap-1">
              <p.icon size={10} /> {p.name}
            </button>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Что купили?" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
             Остаток в кошельке ПОСЛЕ
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={remGold} onChange={(e) => setRemGold(e.target.value)} placeholder="G" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none" />
            <input type="number" value={remSilver} onChange={(e) => setRemSilver(e.target.value)} placeholder="S" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none" />
            <input type="number" value={remCopper} onChange={(e) => setRemCopper(e.target.value)} placeholder="C" className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none" />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting || currentBalance === 0} className="w-full py-5 rounded-2xl font-black uppercase text-slate-950 bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-xl">
          {isSubmitting ? 'Запись...' : 'Внести расход'}
        </button>
      </form>
    </div>
  );
};

export default PurchaseForm;
