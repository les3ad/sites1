
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TradeRecord, NodeInfo, ActiveTrip, PackType } from '../types';
import { currencyToCopper, formatCurrency, copperToCurrency } from '../utils/currency';
import { PlusCircle, MapPin, Coins, Package, Search, Wallet, Clock, Play, Flag, Star, X, CheckCircle2, ChevronRight, History, ArrowRightLeft, Sparkles, Gem, Box, TrendingUp, RefreshCcw } from 'lucide-react';

interface TradeFormProps {
  nodes: NodeInfo[];
  trades: TradeRecord[];
  onAddTrade: (trade: TradeRecord) => void;
  currentBalance?: number;
}

const PackTypeIcon: React.FC<{ type: PackType; size?: number }> = ({ type, size = 16 }) => {
  switch (type) {
    case 'luxury': return <Gem size={size} className="text-sky-400" />;
    case 'rare': return <Sparkles size={size} className="text-purple-400" />;
    case 'quest': return <Box size={size} className="text-amber-400" />;
    default: return <Package size={size} className="text-slate-400" />;
  }
};

const TradeForm: React.FC<TradeFormProps> = ({ nodes, trades, onAddTrade, currentBalance }) => {
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [packType, setPackType] = useState<PackType>('basic');
  
  const [packsCount, setPacksCount] = useState<string>('3');
  const [gold, setGold] = useState<string>('');
  const [silver, setSilver] = useState<string>('');
  const [copper, setCopper] = useState<string>('');

  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(() => {
    const saved = localStorage.getItem('aoc_active_trip');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [showFinalPriceInput, setShowFinalPriceInput] = useState(false);
  const [tripEndDuration, setTripEndDuration] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Smart Node Sorting (Popularity based)
  const sortedNodes = useMemo(() => {
    const usageMap = new Map<string, number>();
    trades.slice(0, 50).forEach(t => {
      usageMap.set(t.fromNode, (usageMap.get(t.fromNode) || 0) + 1);
      usageMap.set(t.toNode, (usageMap.get(t.toNode) || 0) + 1);
    });
    return [...nodes].sort((a, b) => (usageMap.get(b.name) || 0) - (usageMap.get(a.name) || 0));
  }, [nodes, trades]);

  const lastTrade = trades[0];

  useEffect(() => {
    let interval: number | undefined;
    if (activeTrip && !showFinalPriceInput) {
      const updateTimer = () => {
        const diff = new Date().getTime() - new Date(activeTrip.startTime).getTime();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      };
      updateTimer();
      interval = window.setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTrip, showFinalPriceInput]);

  useEffect(() => {
    if (activeTrip) localStorage.setItem('aoc_active_trip', JSON.stringify(activeTrip));
    else localStorage.removeItem('aoc_active_trip');
  }, [activeTrip]);

  const filteredNodes = (search: string) => {
    return sortedNodes.filter(node => node.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6);
  };

  const handleStartTrip = () => {
    if (!fromSearch || !toSearch || fromSearch === toSearch) return;
    setActiveTrip({
      startTime: new Date().toISOString(),
      fromNode: fromSearch,
      toNode: toSearch,
      packsCount: Number(packsCount) || 3,
      packType
    });
    setShowFinalPriceInput(false);
  };

  const handleFinishTrip = () => {
    if (!activeTrip) return;
    const diff = new Date().getTime() - new Date(activeTrip.startTime).getTime();
    setTripEndDuration(Math.max(1, Math.floor(diff / 60000)));
    
    // Auto-fill last known price for this exact route
    const lastPriceRecord = trades.find(t => t.fromNode === activeTrip.fromNode && t.toNode === activeTrip.toNode && t.packType === activeTrip.packType);
    if (lastPriceRecord) {
      const cur = copperToCurrency(lastPriceRecord.pricePerPack);
      setGold(cur.gold.toString()); setSilver(cur.silver.toString()); setCopper(cur.copper.toString());
    }
    setShowFinalPriceInput(true);
  };

  const repeatLastTrip = () => {
    if (!lastTrade) return;
    setFromSearch(lastTrade.fromNode);
    setToSearch(lastTrade.toNode);
    setPacksCount(lastTrade.packsCount.toString());
    setPackType(lastTrade.packType || 'basic');
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0 opacity-50"></div>
      
      {showFinalPriceInput && activeTrip ? (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Завершение рейса</span>
                <span className="text-xs font-mono font-black text-white px-2 py-1 bg-emerald-500/20 rounded-lg">{tripEndDuration} мин</span>
             </div>
             <p className="text-sm font-bold text-white">{activeTrip.fromNode} → {activeTrip.toNode}</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const price = currencyToCopper(Number(gold) || 0, Number(silver) || 0, Number(copper) || 0);
            onAddTrade({
              id: crypto.randomUUID(),
              fromNode: activeTrip.fromNode,
              toNode: activeTrip.toNode,
              packsCount: activeTrip.packsCount,
              packType: activeTrip.packType,
              pricePerPack: price,
              profit: price * activeTrip.packsCount,
              timestamp: new Date().toISOString(),
              type: 'sale',
              durationMinutes: tripEndDuration || 1
            });
            setActiveTrip(null);
            setShowFinalPriceInput(false);
            setGold(''); setSilver(''); setCopper('');
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Цена продажи (за 1 пак)</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <input type="number" value={gold} onChange={e => setGold(e.target.value)} placeholder="G" autoFocus className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none focus:border-emerald-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xs">G</span>
                </div>
                <div className="relative">
                  <input type="number" value={silver} onChange={e => setSilver(e.target.value)} placeholder="S" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none focus:border-emerald-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">S</span>
                </div>
                <div className="relative">
                  <input type="number" value={copper} onChange={e => setCopper(e.target.value)} placeholder="C" className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black outline-none focus:border-emerald-500" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-700 font-black text-xs">C</span>
                </div>
              </div>
            </div>
            <button type="submit" className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-slate-950 bg-emerald-500 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all">
              <Coins size={18} className="inline mr-2" /> Сохранить
            </button>
          </form>
        </div>
      ) : activeTrip ? (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
           <div className="flex flex-col items-center justify-center py-10 bg-amber-500/5 border border-amber-500/10 rounded-[3rem]">
              <Clock className="text-amber-500 animate-pulse mb-4" size={48} />
              <span className="text-5xl font-mono font-black text-white tracking-tighter mb-2">{elapsedTime}</span>
              <p className="text-[11px] text-amber-500/60 font-black uppercase tracking-widest">{activeTrip.fromNode} → {activeTrip.toNode}</p>
           </div>
           <div className="flex gap-4">
             <button onClick={() => { if(confirm('Сбросить?')) setActiveTrip(null); }} className="flex-1 py-5 rounded-2xl font-black text-rose-500 border border-rose-500/10 hover:bg-rose-500/5 transition-all text-xs uppercase tracking-widest">Отмена</button>
             <button onClick={handleFinishTrip} className="flex-[2] py-5 rounded-2xl font-black text-slate-950 bg-amber-500 hover:scale-105 transition-all shadow-xl shadow-amber-500/20">
               <Flag size={18} className="inline mr-2" /> Приехали!
             </button>
           </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Маршрут Верры</h2>
            {lastTrade && (
              <button onClick={repeatLastTrip} className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-amber-500 hover:text-white transition-all uppercase">
                <RefreshCcw size={12} /> Повторить
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="relative" ref={fromRef}>
              <div className="relative">
                <input type="text" value={fromSearch} onFocus={() => setShowFromSuggestions(true)} onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)} onChange={e => setFromSearch(e.target.value)} placeholder="Откуда..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none" />
                <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" />
              </div>
              {showFromSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                  {filteredNodes(fromSearch).map(node => (
                    <button key={node.id} type="button" onClick={() => setFromSearch(node.name)} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors">
                      {node.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={toRef}>
              <div className="relative">
                <input type="text" value={toSearch} onFocus={() => setShowToSuggestions(true)} onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)} onChange={e => setToSearch(e.target.value)} placeholder="Куда..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none" />
                <Flag size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700" />
              </div>
              {showToSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                  {filteredNodes(toSearch).map(node => (
                    <button key={node.id} type="button" onClick={() => setToSearch(node.name)} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors">
                      {node.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                {['1', '2', '3'].map(num => (
                  <button key={num} type="button" onClick={() => setPacksCount(num)} className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${packsCount === num ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-500'}`}>{num}</button>
                ))}
              </div>
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                {(['basic', 'luxury', 'rare', 'quest'] as PackType[]).map(type => (
                  <button key={type} type="button" onClick={() => setPackType(type)} className={`flex-1 py-2 rounded-xl flex items-center justify-center transition-all ${packType === type ? 'bg-slate-800 scale-105' : 'opacity-40 hover:opacity-100'}`}>
                    <PackTypeIcon type={type} size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleStartTrip} disabled={!fromSearch || !toSearch || fromSearch === toSearch} className="w-full py-5 rounded-2xl font-black text-slate-950 bg-amber-500 hover:scale-[1.02] disabled:opacity-50 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
            <Play size={18} /> В путь!
          </button>
          {fromSearch === toSearch && fromSearch !== '' && (
            <p className="text-[10px] text-rose-500 font-black text-center uppercase">Пункт А не может быть равен Пункту Б</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeForm;
