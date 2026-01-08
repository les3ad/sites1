
import React, { useState, useMemo, useEffect } from 'react';
import { TradeRecord, ExpenseRecord, CoinSaleRecord, RouteStats } from '../types';
import { formatCurrency } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Activity, Zap, ShoppingCart, DollarSign, Clock, Star, Wallet, Target, ArrowDownRight, ArrowUpRight, Timer, PlayCircle } from 'lucide-react';

interface DashboardProps {
  trades: TradeRecord[];
  expenses: ExpenseRecord[];
  coinSales: CoinSaleRecord[];
  dayStartTime: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ trades, expenses, coinSales, dayStartTime }) => {
  const [filterType, setFilterType] = useState<'session' | 'all'>(dayStartTime ? 'session' : 'all');
  const [sessionTimer, setSessionTimer] = useState<string>('00:00:00');

  // Timer for active session
  useEffect(() => {
    let interval: number | undefined;
    if (dayStartTime) {
      const update = () => {
        const start = new Date(dayStartTime).getTime();
        const diff = Date.now() - start;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setSessionTimer(`${h}:${m}:${s}`);
      };
      update();
      interval = window.setInterval(update, 1000);
    }
    return () => clearInterval(interval);
  }, [dayStartTime]);

  const filteredData = useMemo(() => {
    let t = [...trades];
    let e = [...expenses];
    let s = [...coinSales];

    if (filterType === 'session' && dayStartTime) {
      const ms = new Date(dayStartTime).getTime();
      t = t.filter(x => new Date(x.timestamp).getTime() >= ms);
      e = e.filter(x => new Date(x.timestamp).getTime() >= ms);
      s = s.filter(x => new Date(x.timestamp).getTime() >= ms);
    }
    return { trades: t, expenses: e, coinSales: s };
  }, [trades, expenses, coinSales, filterType, dayStartTime]);

  const stats = useMemo((): RouteStats[] => {
    const map = new Map<string, { total: number; count: number; packs: number; lastUsed: string; from: string; to: string; totalDuration: number }>();
    filteredData.trades.forEach(t => {
      const key = `${t.fromNode} → ${t.toNode}`;
      const existing = map.get(key) || { total: 0, count: 0, packs: 0, lastUsed: t.timestamp, from: t.fromNode, to: t.toNode, totalDuration: 0 };
      map.set(key, { 
        total: existing.total + t.profit, 
        count: existing.count + 1,
        packs: existing.packs + t.packsCount,
        lastUsed: new Date(t.timestamp) > new Date(existing.lastUsed) ? t.timestamp : existing.lastUsed,
        from: t.fromNode,
        to: t.toNode,
        totalDuration: existing.totalDuration + (t.durationMinutes || 0)
      });
    });

    return Array.from(map.entries()).map(([route, data]) => {
      const avgDuration = data.totalDuration / data.count;
      const avgProfit = data.total / data.count;
      return {
        route, from: data.from, to: data.to, totalProfit: data.total, count: data.count, totalPacks: data.packs,
        avgProfit: Math.round(avgProfit), avgDuration: Math.round(avgDuration),
        efficiencyIndex: avgDuration > 0 ? (avgProfit / 10000) / avgDuration : 0,
        lastUsed: data.lastUsed
      };
    }).sort((a, b) => b.efficiencyIndex - a.efficiencyIndex).slice(0, 5);
  }, [filteredData]);

  const totalProfit = filteredData.trades.reduce((sum, t) => sum + t.profit, 0);
  const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUsdEarned = filteredData.coinSales.reduce((sum, s) => sum + s.usdPrice, 0);
  const totalNet = totalProfit - totalExpenses;

  // Efficiency calculation (Gold per hour)
  const gPerHour = useMemo(() => {
    if (!dayStartTime || filteredData.trades.length === 0) return 0;
    const durationHours = (Date.now() - new Date(dayStartTime).getTime()) / 3600000;
    return durationHours > 0 ? totalNet / durationHours : 0;
  }, [dayStartTime, totalNet, filteredData.trades]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Filters & Session Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800 w-fit backdrop-blur-xl">
          {[
            {id: 'session', label: dayStartTime ? 'Текущая смена' : 'Последние данные'},
            {id: 'all', label: 'Вся история'}
          ].map(btn => (
            <button key={btn.id} onClick={() => setFilterType(btn.id as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === btn.id ? 'bg-slate-800 text-amber-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              {btn.label}
            </button>
          ))}
        </div>
        
        {dayStartTime && (
          <div className="flex items-center gap-6 px-8 py-3 bg-amber-500/5 rounded-2xl border border-amber-500/20 animate-in zoom-in-95">
             <div className="flex items-center gap-2 text-amber-500">
               <Timer size={16} className="animate-spin-slow" />
               <span className="text-lg font-black font-mono tabular-nums">{sessionTimer}</span>
             </div>
             <div className="h-4 w-px bg-slate-800"></div>
             <div className="flex items-center gap-2">
               <TrendingUp size={16} className="text-emerald-500" />
               <span className="text-xs font-black text-emerald-400 uppercase tracking-tighter">{(gPerHour/10000).toFixed(1)} G/час</span>
             </div>
          </div>
        )}
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-amber-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl backdrop-blur-md">
          <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500 rotate-12"><TrendingUp size={120} /></div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><ArrowUpRight size={14} className="text-amber-500"/> Доход</div>
          <div className="text-3xl font-black text-white tracking-tight">{formatCurrency(totalProfit)}</div>
          <div className="text-[10px] text-slate-600 mt-4 font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity size={10} /> Рейсов: {filteredData.trades.length}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-rose-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl backdrop-blur-md">
          <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-rose-500 rotate-12"><ShoppingCart size={120} /></div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><ArrowDownRight size={14} className="text-rose-500"/> Траты</div>
          <div className="text-3xl font-black text-white tracking-tight">-{formatCurrency(totalExpenses)}</div>
          <div className="text-[10px] text-slate-600 mt-4 font-bold uppercase tracking-widest">
            Чеков: {filteredData.expenses.length}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl backdrop-blur-md">
          <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500 rotate-12"><Target size={120} /></div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><DollarSign size={14} className="text-emerald-500"/> USD Вывод</div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">${totalUsdEarned.toFixed(2)}</div>
          <div className="text-[10px] text-slate-600 mt-4 font-bold uppercase tracking-widest">
            Экспорт валюты
          </div>
        </div>

        <div className={`bg-slate-900/60 border p-8 rounded-[2.5rem] relative overflow-hidden group transition-all shadow-2xl backdrop-blur-md ${totalNet >= 0 ? 'border-amber-500/40 shadow-amber-500/5' : 'border-rose-500/40 shadow-rose-500/5'}`}>
          <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-amber-500 rotate-12"><Wallet size={120} /></div>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Дельта (Чистыми)</div>
          <div className={`text-3xl font-black tabular-nums tracking-tight ${totalNet >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
            {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
          </div>
          <div className="text-[10px] text-slate-600 mt-4 font-bold uppercase tracking-widest flex items-center gap-2">
            <Clock size={10} /> Темп: {Math.round(gPerHour/10000)} G/час
          </div>
        </div>
      </div>

      {/* Analytical Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Most Profitable Routes */}
        <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[4rem] shadow-2xl backdrop-blur-xl">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-sky-500/10 rounded-[1.5rem]"><Star className="text-sky-400" size={28} /></div>
                 <div>
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Торговые Пути</h3>
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Рейтинг эффективности</p>
                 </div>
              </div>
           </div>
           
           <div className="space-y-4">
              {stats.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                  <PlayCircle size={40} className="mx-auto text-slate-800 mb-4 opacity-20" />
                  <p className="text-slate-700 font-black uppercase text-[10px] tracking-widest">Нет данных для анализа маршрутов</p>
                </div>
              ) : (
                stats.map((route, i) => (
                  <div key={route.route} className="flex items-center justify-between p-6 bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 hover:border-amber-500/20 transition-all group cursor-default">
                     <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500'}`}>{i + 1}</div>
                        <div>
                           <div className="text-sm font-black text-white group-hover:text-amber-500 transition-colors">{route.route}</div>
                           <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                             <Timer size={10}/> {route.avgDuration}м • {route.count} рейсов
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-lg font-black text-emerald-400 tracking-tighter">{(route.efficiencyIndex).toFixed(2)} <span className="text-[9px] uppercase font-black opacity-40">G/мин</span></div>
                        <div className="text-[10px] font-bold text-slate-700 uppercase">Ср: {formatCurrency(route.avgProfit)}</div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Dynamic Chart Area */}
        <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[4rem] shadow-2xl backdrop-blur-xl flex flex-col h-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
               <div className="p-4 bg-amber-500/10 rounded-[1.5rem]"><Activity className="text-amber-500" size={28} /></div>
               <div>
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white leading-none">Волатильность</h3>
                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Динамика цен на паки</p>
               </div>
            </div>
          </div>
          <div className="flex-1 min-h-[350px]">
            {filteredData.trades.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData.trades.slice(-15).reverse()}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="timestamp" tickFormatter={(v)=>new Date(v).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} tick={{fill: '#475569', fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '2rem', padding: '1rem' }} itemStyle={{ color: '#f59e0b', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                  <Area type="monotone" dataKey="pricePerPack" stroke="#f59e0b" fill="url(#colorProfit)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-800 font-black uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-800 rounded-[3rem]">
                Нужно больше рейсов для графика
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
