
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TradeRecord, ExpenseRecord, CoinSaleRecord, ShiftRecord, NodeInfo, ChatMessage, AppLog, IdleRecord } from './types';
import { 
  STORAGE_KEY, 
  EXPENSES_STORAGE_KEY, 
  COIN_SALES_STORAGE_KEY, 
  SHIFTS_STORAGE_KEY,
  NODES_STORAGE_KEY, 
  DEFAULT_NODES, 
  CURRENT_SCHEMA_VERSION 
} from './constants';
import { formatCurrency, currencyToCopper, copperToCurrency, formatPLN } from './utils/currency';
import TradeForm from './components/TradeForm';
import PurchaseForm from './components/PurchaseForm';
import CoinSaleForm from './components/CoinSaleForm';
import TradeHistory from './components/TradeHistory';
import Dashboard from './components/Dashboard';
import { getTradingAdvice, startOracleChat, extractIdleReason } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { 
  Compass, 
  Sparkles, 
  LayoutDashboard, 
  ScrollText, 
  RefreshCw, 
  X, 
  Database, 
  Download, 
  Upload, 
  Trash2,
  Play,
  Send,
  Key,
  CalendarDays,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  History as HistoryIcon,
  ChevronRight,
  ShieldCheck,
  Zap,
  Timer,
  Coins,
  User,
  Banknote,
  Quote,
  Volume2,
  VolumeX,
  AudioLines,
  Megaphone,
  Scale,
  BarChart3,
  ExternalLink
} from 'lucide-react';

const FormattedText: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-black">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};

const OracleResponse: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  
  return (
    <div className="space-y-6">
      {lines.map((line, i) => {
        if (line.startsWith('##')) {
          return (
            <div key={i} className="mt-10 mb-4 flex items-center gap-4 border-b border-slate-800 pb-4">
              <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
              <h3 className="text-xl font-black uppercase text-white tracking-tighter italic">
                <FormattedText content={line.replace('##', '').trim()} />
              </h3>
            </div>
          );
        }
        
        const listMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (listMatch) {
          return (
            <div key={i} className="group relative bg-slate-800/30 hover:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700/40 transition-all duration-300 shadow-lg hover:shadow-indigo-500/5">
              <div className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-400">
                  {listMatch[1]}
                </div>
                <div className="text-slate-300 text-sm leading-relaxed font-medium">
                  <FormattedText content={listMatch[2]} />
                </div>
              </div>
            </div>
          );
        }

        return (
          <p key={i} className="text-slate-400 text-sm leading-relaxed px-2 italic">
            <FormattedText content={line} />
          </p>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [coinSales, setCoinSales] = useState<CoinSaleRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [idleRecords, setIdleRecords] = useState<IdleRecord[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showStartDayModal, setShowStartDayModal] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'shifts' | 'ai-analysis'>('dashboard');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem('aoc_audio_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [dayStartTime, setDayStartTime] = useState<string | null>(null);
  const [startingBalance, setStartingBalance] = useState<number>(0); 
  const [startGold, setStartGold] = useState('');
  const [startSilver, setStartSilver] = useState('');
  const [startCopper, setStartCopper] = useState('');

  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string, type: AppLog['type'] = 'info') => {
    const newLog: AppLog = { id: crypto.randomUUID(), msg, type, time: new Date().toLocaleTimeString() };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const handleKeySelection = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      addLog("Ключ обновлен. Попробуйте снова.", "success");
      chatSessionRef.current = null;
    }
  };

  const speak = (text: string) => {
    if (!isAudioEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plainText = text.replace(/\*\*/g, '').replace(/##/g, '');
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'ru-RU';
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.lang.startsWith('ru') && (v.name.toLowerCase().includes('dmitry') || v.name.toLowerCase().includes('male')));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    localStorage.setItem('aoc_audio_enabled', isAudioEnabled.toString());
  }, [isAudioEnabled]);

  const sessionActivity = useMemo(() => {
    if (!dayStartTime) return { profit: 0, expenses: 0, sales: 0, count: 0, net: 0 };
    const startMs = new Date(dayStartTime).getTime();
    const sTrades = trades.filter(t => new Date(t.timestamp).getTime() >= startMs);
    const sExpenses = expenses.filter(e => new Date(e.timestamp).getTime() >= startMs);
    const sSales = coinSales.filter(s => new Date(s.timestamp).getTime() >= startMs);
    const p = sTrades.reduce((sum, t) => sum + t.profit, 0);
    const e = sExpenses.reduce((sum, e) => sum + e.amount, 0);
    const s = sSales.reduce((sum, s) => sum + s.amount, 0);
    return { profit: p, expenses: e, sales: s, count: sTrades.length, net: p - e - s };
  }, [trades, expenses, coinSales, dayStartTime]);

  const totalWalletCopper = useMemo(() => {
    if (dayStartTime) return startingBalance + sessionActivity.net;
    return trades.reduce((sum, t) => sum + t.profit, 0) - expenses.reduce((sum, e) => sum + e.amount, 0) - coinSales.reduce((sum, s) => sum + s.amount, 0);
  }, [startingBalance, sessionActivity, dayStartTime, trades, expenses, coinSales]);

  const sessionUsdEarned = useMemo(() => {
    if (!dayStartTime) return 0;
    const startMs = new Date(dayStartTime).getTime();
    return coinSales
      .filter(s => new Date(s.timestamp).getTime() >= startMs)
      .reduce((sum, s) => sum + s.usdPrice, 0);
  }, [coinSales, dayStartTime]);

  const dailyUsdEarned = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return coinSales
      .filter(s => new Date(s.timestamp).getTime() >= startOfDay)
      .reduce((sum, s) => sum + s.usdPrice, 0);
  }, [coinSales]);

  const exportData = () => {
    const data = { trades, expenses, coinSales, shifts, idleRecords, dayStartTime, startingBalance, version: CURRENT_SCHEMA_VERSION, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashes-merchant-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    addLog("Данные экспортированы", "success");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.trades) setTrades(data.trades);
        if (data.expenses) setExpenses(data.expenses);
        if (data.coinSales) setCoinSales(data.coinSales);
        if (data.shifts) setShifts(data.shifts);
        if (data.idleRecords) setIdleRecords(data.idleRecords);
        if (data.dayStartTime) setDayStartTime(data.dayStartTime);
        if (data.startingBalance !== undefined) setStartingBalance(data.startingBalance);
        addLog("Данные восстановлены", "success");
        setShowDbSettings(false);
      } catch (err) { addLog("Ошибка импорта", "error"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const get = (key: string) => localStorage.getItem(key);
    try {
      if (get(STORAGE_KEY)) setTrades(JSON.parse(get(STORAGE_KEY)!));
      if (get(EXPENSES_STORAGE_KEY)) setExpenses(JSON.parse(get(EXPENSES_STORAGE_KEY)!));
      if (get(COIN_SALES_STORAGE_KEY)) setCoinSales(JSON.parse(get(COIN_SALES_STORAGE_KEY)!));
      if (get(SHIFTS_STORAGE_KEY)) setShifts(JSON.parse(get(SHIFTS_STORAGE_KEY)!));
      if (get('aoc_idle_records')) setIdleRecords(JSON.parse(get('aoc_idle_records')!));
      const savedStart = get('aoc_day_start');
      if (savedStart && savedStart !== 'null') {
        setDayStartTime(savedStart);
        setStartingBalance(Number(get('aoc_starting_balance') || 0));
      }
      setNodes(DEFAULT_NODES);
    } catch (e) {}
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
      localStorage.setItem(COIN_SALES_STORAGE_KEY, JSON.stringify(coinSales));
      localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
      localStorage.setItem('aoc_idle_records', JSON.stringify(idleRecords));
      if (dayStartTime) {
        localStorage.setItem('aoc_day_start', dayStartTime);
        localStorage.setItem('aoc_starting_balance', startingBalance.toString());
      } else {
        localStorage.removeItem('aoc_day_start');
        localStorage.removeItem('aoc_starting_balance');
      }
    }
  }, [trades, expenses, coinSales, shifts, idleRecords, dayStartTime, startingBalance, isDataLoaded]);

  const confirmStartDay = () => {
    const total = currencyToCopper(Number(startGold) || 0, Number(startSilver) || 0, Number(startCopper) || 0);
    setStartingBalance(total);
    setDayStartTime(new Date().toISOString());
    setShowStartDayModal(false);
    setStartGold(''); setStartSilver(''); setStartCopper('');
    addLog("Смена открыта", "success");
    speak("Смена открыта. Да пребудет с тобой прибыль.");
  };

  const handleEndShift = () => {
    if (!dayStartTime) return;
    const newShift: ShiftRecord = {
      id: crypto.randomUUID(),
      startTime: dayStartTime,
      endTime: new Date().toISOString(),
      startingBalance,
      endingBalance: totalWalletCopper,
      totalProfit: sessionActivity.profit,
      totalExpenses: sessionActivity.expenses,
      totalCoinSales: sessionActivity.sales,
      tradesCount: sessionActivity.count,
      netProfit: sessionActivity.net
    };
    setShifts(prev => [newShift, ...prev]);
    setDayStartTime(null);
    setStartingBalance(0);
    setShowEndShiftModal(false);
    addLog("Смена завершена", "success");
    speak("Смена завершена. Хорошая работа.");
  };

  const fetchAiAdvice = async () => {
    setIsAiLoading(true);
    try {
      const advice = await getTradingAdvice(trades, expenses, coinSales, shifts, idleRecords);
      setAiAdvice(advice || '');
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Requested entity was not found.") || msg.includes("quota") || msg.includes("429")) {
        addLog("Лимит API превышен. Смените ключ.", "error");
        handleKeySelection();
      } else {
        addLog("Ошибка Оракула", "error");
      }
    } finally { setIsAiLoading(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    const input = chatInput;
    setChatInput('');
    setIsChatLoading(true);
    try {
      const idleAnalysis = await extractIdleReason(input);
      if (idleAnalysis?.isIdleAnnouncement) {
        setIdleRecords(prev => [...prev, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), reason: idleAnalysis.reason }]);
      }
      if (!chatSessionRef.current) chatSessionRef.current = startOracleChat(trades, expenses, coinSales, shifts, idleRecords);
      const response = await chatSessionRef.current.sendMessage({ message: input });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Requested entity was not found.") || msg.includes("quota") || msg.includes("429")) {
        addLog("Лимит API превышен. Смените ключ.", "error");
        setChatMessages(prev => [...prev, { role: 'model', text: "Оракул истощен (лимит квот). Пожалуйста, выберите другой API ключ или подождите.", timestamp: new Date().toISOString() }]);
        handleKeySelection();
      } else {
        addLog("Ошибка чата", "error");
      }
    } finally { setIsChatLoading(false); }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const getDurationString = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}ч ${m}м`;
  };

  const getGoldPerHour = (net: number, start: string, end: string) => {
    const diffHours = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
    return diffHours > 0 ? Math.round(net / diffHours) : 0;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans pb-44 selection:bg-amber-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-16 border-b border-slate-900 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-amber-500 p-5 rounded-[2.5rem] shadow-2xl cursor-pointer hover:rotate-6 transition-transform group" onClick={() => setActiveTab('dashboard')}>
              <Compass className="text-slate-950 group-hover:scale-110 transition-transform" size={42} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-[0.4em] border border-amber-500/20 rounded-full">MERCHANT ENGINE v{CURRENT_SCHEMA_VERSION}</span>
                {dayStartTime && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">SESSION LIVE</span>
                  </div>
                )}
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Verra <span className="text-amber-500">Merchant</span></h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
             <button onClick={() => { if(isSpeaking) stopSpeaking(); else setIsAudioEnabled(!isAudioEnabled); }} className={`p-3 border rounded-2xl transition-all shadow-lg ${isAudioEnabled ? 'bg-slate-900 border-slate-800 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`} title="Звуковые эффекты">
               {isSpeaking ? <AudioLines className="animate-pulse" size={18} /> : (isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />)}
             </button>
             <button onClick={handleKeySelection} className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-amber-500 hover:scale-110 transition-all shadow-lg" title="Сменить API Ключ">
               <Key size={18} />
               <span className="text-[10px] font-black uppercase pr-1">Ключ</span>
             </button>
             {dayStartTime ? (
               <button onClick={() => setShowEndShiftModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase bg-rose-500 text-slate-950 border border-rose-500 hover:scale-105 transition-all shadow-xl">
                 <X size={16} /> Стоп Смена
               </button>
             ) : (
               <button onClick={() => setShowStartDayModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase bg-emerald-500 text-slate-950 border border-emerald-500 hover:scale-105 transition-all shadow-xl">
                 <Play size={16} /> Начать Смену
               </button>
             )}
             <button onClick={() => setShowDbSettings(true)} className="px-6 py-3 rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 transition-all uppercase font-black text-[10px] tracking-widest flex items-center gap-2">
               <Database size={14} /> База
             </button>
          </div>
        </header>

        <div className="flex justify-center mb-12 sticky top-6 z-50">
          <nav className="flex bg-slate-900/60 p-2 rounded-2xl border border-slate-800/50 backdrop-blur-2xl shadow-2xl">
            <button onClick={() => setActiveTab('dashboard')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-slate-800 text-amber-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <LayoutDashboard size={14} /> Аналитика
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'history' ? 'bg-slate-800 text-amber-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <ScrollText size={14} /> Журнал
            </button>
            <button onClick={() => setActiveTab('shifts')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'shifts' ? 'bg-slate-800 text-amber-500 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <HistoryIcon size={14} /> Смены
            </button>
            <button onClick={() => setActiveTab('ai-analysis')} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'ai-analysis' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <Zap size={14} /> Оракул
            </button>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
          <div className="lg:col-span-4 space-y-8">
             {dayStartTime ? (
               <>
                 <TradeForm nodes={nodes} trades={trades} onAddTrade={(t) => setTrades(p => [t, ...p])} currentBalance={totalWalletCopper} />
                 <PurchaseForm onAddExpense={(e) => setExpenses(p => [e, ...p])} currentBalance={totalWalletCopper} />
                 <CoinSaleForm onAddCoinSale={(s) => setCoinSales(p => [s, ...p])} currentBalance={totalWalletCopper} />
               </>
             ) : (
               <div className="bg-slate-900/40 border-2 border-dashed border-slate-800 p-12 rounded-[3rem] text-center backdrop-blur-xl">
                  <div className="bg-amber-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="text-amber-500" size={40} />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">Готов к работе?</h3>
                  <button onClick={() => setShowStartDayModal(true)} className="w-full py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl">Начать смену</button>
               </div>
             )}
          </div>

          <div className="lg:col-span-8 space-y-10">
            <main className="min-h-[750px]">
              {activeTab === 'dashboard' && <Dashboard trades={trades} expenses={expenses} coinSales={coinSales} dayStartTime={dayStartTime} />}
              {activeTab === 'history' && <TradeHistory trades={trades} expenses={expenses} coinSales={coinSales} onDeleteTrade={id => setTrades(p => p.filter(t => t.id !== id))} onDeleteExpense={id => setExpenses(p => p.filter(e => e.id !== id))} onDeleteCoinSale={id => setCoinSales(p => p.filter(s => s.id !== id))} onUpdateTrade={u => setTrades(p => p.map(t => t.id === u.id ? u : t))} onUpdateExpense={u => setExpenses(p => p.map(e => e.id === u.id ? u : e))} onUpdateCoinSale={u => setCoinSales(p => p.map(s => s.id === u.id ? u : s))} />}
              
              {activeTab === 'shifts' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20"><CalendarDays className="text-amber-500" size={28} /></div>
                      <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Архив Смен</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Финансовая история империи</p>
                      </div>
                    </div>
                  </div>
                  
                  {shifts.length === 0 ? (
                    <div className="bg-slate-900/40 p-24 rounded-[3rem] text-center border border-slate-800 border-dashed">
                      <HistoryIcon size={64} className="mx-auto text-slate-800 mb-6" />
                      <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">Архив пуст.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {shifts.map(shift => {
                        const duration = getDurationString(shift.startTime, shift.endTime);
                        const gPerHour = getGoldPerHour(shift.netProfit, shift.startTime, shift.endTime);
                        const avgPerPack = shift.tradesCount > 0 ? Math.round(shift.totalProfit / shift.tradesCount) : 0;
                        
                        return (
                          <div key={shift.id} className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-[3.5rem] relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-2xl backdrop-blur-md">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800/50 pb-6">
                              <div className="flex items-center gap-5">
                                <div className="p-4 bg-slate-950 rounded-2xl text-amber-500"><Timer size={24} /></div>
                                <div>
                                  <div className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">{new Date(shift.startTime).toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                  <div className="text-xl font-black text-white italic">
                                    {new Date(shift.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                                    <span className="mx-3 text-slate-700">→</span> 
                                    {new Date(shift.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-4">
                                <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                                  <Clock size={12} className="text-slate-500" />
                                  <span className="text-xs font-black text-slate-300">{duration}</span>
                                </div>
                                <div className="px-4 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                                  <TrendingUp size={12} className="text-emerald-500" />
                                  <span className="text-xs font-black text-emerald-400 uppercase tracking-tighter">{(gPerHour/10000).toFixed(1)} G/час</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1"><ArrowUpRight size={10} className="text-emerald-500"/> Доход рейсов</span>
                                <div className="text-lg font-black text-emerald-400">+{formatCurrency(shift.totalProfit)}</div>
                                <div className="text-[9px] text-slate-600 font-bold uppercase">{shift.tradesCount} рейсов выполнено</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1"><ArrowDownRight size={10} className="text-rose-500"/> Расходы</span>
                                <div className="text-lg font-black text-rose-400">-{formatCurrency(shift.totalExpenses)}</div>
                                <div className="text-[9px] text-slate-600 font-bold uppercase">Закупки и ремонт</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1"><Banknote size={10} className="text-indigo-400"/> Вывод USD</span>
                                <div className="text-lg font-black text-indigo-400">-{formatCurrency(shift.totalCoinSales)}</div>
                                <div className="text-[9px] text-slate-600 font-bold uppercase">Конвертация в валюту</div>
                              </div>
                              <div className="space-y-1 text-right">
                                <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Чистая Дельта</span>
                                <div className={`text-2xl font-black tabular-nums tracking-tighter ${shift.netProfit >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                                  {shift.netProfit >= 0 ? '+' : ''}{formatCurrency(shift.netProfit)}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-800/40">
                              <div className="flex items-center gap-3 text-slate-500 bg-slate-950/40 px-6 py-3 rounded-2xl border border-slate-800/50">
                                <Scale size={14} className="opacity-50" />
                                <div className="text-[10px] font-black uppercase tracking-widest">Баланс: <span className="text-slate-400">{formatCurrency(shift.startingBalance)}</span></div>
                                <ChevronRight size={10} className="opacity-20" />
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">{formatCurrency(shift.endingBalance)}</div>
                              </div>
                              <div className="flex items-center justify-end gap-3 text-slate-500 bg-slate-950/40 px-6 py-3 rounded-2xl border border-slate-800/50">
                                <BarChart3 size={14} className="opacity-50" />
                                <div className="text-[10px] font-black uppercase tracking-widest">В среднем за пак: <span className="text-amber-500/80">{formatCurrency(avgPerPack)}</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ai-analysis' && (
                <div className="space-y-10">
                  <div className="bg-slate-900 border border-indigo-500/20 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 relative z-10">
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-indigo-500/10 rounded-3xl border border-indigo-500/20"><Sparkles className="text-indigo-400" size={36} /></div>
                        <div>
                          <h2 className="text-3xl font-black uppercase italic text-white tracking-tighter">Свитки Оракула</h2>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Машинный аудит торговых путей</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={fetchAiAdvice} disabled={isAiLoading} className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center gap-4 hover:scale-105 transition-all shadow-xl disabled:opacity-50">
                          {isAiLoading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} Прочесть свиток
                        </button>
                        {aiAdvice && (
                          <button onClick={() => speak(aiAdvice)} className="p-5 bg-slate-800 text-indigo-400 border border-indigo-500/20 rounded-[1.5rem] hover:bg-indigo-500/10 transition-all shadow-xl flex items-center gap-2">
                            <Megaphone size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Слушать</span>
                          </button>
                        )}
                      </div>
                    </div>
                    {aiAdvice && (
                      <div className="bg-slate-950/80 p-10 rounded-[3rem] border border-slate-800 shadow-inner backdrop-blur-sm">
                         <OracleResponse text={aiAdvice} />
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-amber-500/10 p-10 rounded-[4rem] shadow-2xl h-[650px] flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto mb-6 pr-4 space-y-6 custom-scrollbar scroll-smooth">
                       {chatMessages.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                             <div className={`max-w-[85%] p-7 rounded-[2.5rem] text-sm relative leading-relaxed ${msg.role === 'user' ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none shadow-xl shadow-amber-500/10' : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700 shadow-lg backdrop-blur-sm shadow-indigo-500/5'}`}>
                                <div className="text-[9px] uppercase font-black opacity-40 mb-3 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {msg.role === 'user' ? <User size={10}/> : <Quote size={10}/>} {msg.role === 'user' ? 'Купец' : 'Оракул'}
                                  </div>
                                  {msg.role === 'model' && (
                                    <button onClick={() => speak(msg.text)} className="p-1 hover:text-amber-500 transition-colors">
                                      <Megaphone size={12} />
                                    </button>
                                  )}
                                </div>
                                <div className="whitespace-pre-wrap">
                                  <FormattedText content={msg.text} />
                                </div>
                             </div>
                          </div>
                       ))}
                       <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="relative group">
                       <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Спроси Оракула..." className="w-full bg-slate-950 border border-slate-800 rounded-3xl py-7 pl-12 pr-28 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-700" />
                       <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-amber-500 text-slate-950 rounded-[1.5rem] hover:scale-105 shadow-xl disabled:opacity-50"><Send size={20} /></button>
                    </form>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800/80 px-10 py-6 rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-3xl z-[70] flex items-center gap-10 border-b-4 border-b-amber-500/30 transition-all hover:scale-[1.01]">
          <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <span className="text-[9px] text-slate-500 uppercase font-black mb-1.5 flex items-center gap-2 group-hover:text-amber-500 transition-colors"><Wallet size={12}/> Кошелек</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tabular-nums text-white group-hover:text-emerald-400 transition-colors tracking-tight">{formatCurrency(totalWalletCopper)}</span>
              {dayStartTime && (
                <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border ${sessionActivity.net >= 0 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border-rose-400/20'}`}>
                  {sessionActivity.net >= 0 ? '+' : ''}{formatCurrency(sessionActivity.net)}
                </div>
              )}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div className="flex flex-col cursor-pointer group" onClick={() => setActiveTab('history')}>
            <span className="text-[9px] text-slate-500 uppercase font-black mb-1.5 flex items-center gap-2 group-hover:text-amber-500 transition-colors"><TrendingUp size={12}/> Смена</span>
            <span className={`text-2xl font-black tabular-nums transition-colors tracking-tight ${sessionActivity.net >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
              {sessionActivity.net >= 0 ? '+' : ''}{formatCurrency(sessionActivity.net)}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div className="flex flex-col group min-w-[140px]">
            <span className="text-[9px] text-slate-500 uppercase font-black mb-1.5 flex items-center gap-2 group-hover:text-sky-500 transition-colors"><Banknote size={12}/> Вывод (PLN)</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tabular-nums text-sky-400 tracking-tight leading-none">
                  {formatPLN(dailyUsdEarned)}
                </span>
                <span className="text-[8px] font-black text-slate-600 uppercase">Сутки</span>
              </div>
              {dayStartTime && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-black tabular-nums text-sky-500/80 leading-none">
                    {formatPLN(sessionUsdEarned)}
                  </span>
                  <span className="text-[7px] font-black text-slate-700 uppercase">Смена</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {showStartDayModal && (
          <div className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-emerald-500/30 p-14 rounded-[4rem] max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              <h3 className="text-4xl font-black text-white uppercase italic mb-4 tracking-tighter flex items-center gap-4"><Play className="text-emerald-500" size={32} /> Новая смена</h3>
              <div className="grid grid-cols-1 gap-5 mb-12">
                <div className="relative group">
                  <input type="number" value={startGold} onChange={e => setStartGold(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-6 pl-12 pr-6 text-white text-xl font-black outline-none focus:border-amber-500" />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500 font-black text-lg">G</span>
                </div>
                <div className="grid grid-cols-2 gap-5">
                   <div className="relative">
                    <input type="number" value={startSilver} onChange={e => setStartSilver(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-6 pl-12 pr-6 text-white text-xl font-black outline-none focus:border-slate-400" />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">S</span>
                  </div>
                  <div className="relative">
                    <input type="number" value={startCopper} onChange={e => setStartCopper(e.target.value)} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-6 pl-12 pr-6 text-white text-xl font-black outline-none focus:border-orange-600" />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-800 font-black text-lg">C</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowStartDayModal(false)} className="flex-1 py-6 bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[11px] hover:text-white transition-all">Отмена</button>
                <button onClick={confirmStartDay} className="flex-[2] py-6 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-[11px] shadow-2xl">Открыть смену</button>
              </div>
            </div>
          </div>
        )}

        {showEndShiftModal && (
          <div className="fixed inset-0 bg-slate-950/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-rose-500/30 p-14 rounded-[4rem] max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
              <h3 className="text-4xl font-black text-white uppercase italic mb-6 tracking-tighter flex items-center gap-4"><ShieldCheck className="text-rose-500" size={32} /> Итоги смены</h3>
              <div className="my-10 bg-slate-950/80 p-10 rounded-[3rem] border border-slate-800 space-y-6">
                 <div className="flex justify-between text-[11px] uppercase font-black text-slate-500"><span>Прибыль:</span><span className="text-emerald-400">+{formatCurrency(sessionActivity.profit)}</span></div>
                 <div className="flex justify-between text-sm uppercase font-black text-white"><span>ИТОГО:</span><span className="text-amber-500 text-lg">{formatCurrency(sessionActivity.net)}</span></div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowEndShiftModal(false)} className="flex-1 py-6 bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[11px] hover:text-white transition-all">Отмена</button>
                <button onClick={handleEndShift} className="flex-[2] py-6 bg-rose-500 text-slate-950 rounded-2xl font-black uppercase text-[11px] shadow-2xl">Завершить</button>
              </div>
            </div>
          </div>
        )}

        {showDbSettings && (
          <div className="fixed inset-0 bg-slate-950/95 z-[120] flex items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 p-14 rounded-[4.5rem] max-w-lg w-full shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter flex items-center gap-5"><Database className="text-indigo-400" /> База данных</h3>
                  <button onClick={() => setShowDbSettings(false)} className="p-4 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"><X size={20}/></button>
               </div>
               
               <div className="space-y-6">
                  <div className="bg-slate-950/60 p-6 rounded-[2.5rem] border border-amber-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                         <Key size={12} /> Управление API-ключом
                       </h4>
                       <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase text-slate-500 hover:text-amber-400 flex items-center gap-1">
                         Биллинг <ExternalLink size={10} />
                       </a>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Если вы исчерпали лимиты (Error 429), вы можете переключиться на другой API ключ здесь.</p>
                    <button onClick={handleKeySelection} className="w-full flex items-center justify-center gap-3 p-4 bg-amber-500 text-slate-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all">
                       <RefreshCw size={14} /> Сменить Ключ
                    </button>
                  </div>

                  <div className="space-y-3">
                    <button onClick={exportData} className="w-full flex items-center justify-between p-6 bg-slate-950/50 border border-slate-800 rounded-[2.5rem] hover:bg-slate-900 transition-all">
                       <span className="text-xs font-black text-white uppercase tracking-tight">Экспорт JSON</span>
                       <Download className="text-indigo-400" size={18} />
                    </button>
                    <label className="w-full flex items-center justify-between p-6 bg-slate-950/50 border border-slate-800 rounded-[2.5rem] hover:bg-slate-900 transition-all cursor-pointer">
                       <span className="text-xs font-black text-white uppercase tracking-tight">Импорт JSON</span>
                       <Upload className="text-emerald-400" size={18} />
                       <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                    <button onClick={() => { if(confirm("Удалить всё? Это действие необратимо.")) { setTrades([]); setShifts([]); setExpenses([]); setDayStartTime(null); setShowDbSettings(false); addLog("База данных очищена", "warning"); }}} className="w-full flex items-center justify-between p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] hover:bg-rose-500/10 transition-all">
                       <span className="text-xs font-black text-rose-500 uppercase tracking-tight">Очистить всё</span>
                       <Trash2 className="text-rose-500" size={18} />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
