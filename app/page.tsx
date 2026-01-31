'use client';

import { useState, useRef } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { generateCsv } from '@/csv/awaken';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ArrowDownToLine, Search, RefreshCw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('polkadot');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [events, setEvents] = useState<OpenTxEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTransactions = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);
    setEvents([]);
    setProgress('Starting fetch...');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      let currentEvents: OpenTxEvent[] = [];
      let nextCursor: string | null = 'transfers:0';

      while (nextCursor) {
        if (ac.signal.aborted) throw new Error('Fetch cancelled');

        setProgress(`Fetching ${nextCursor.replace(':', ' page ')}...`);

        const res: Response = await fetch('/api/polkadot/txs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, cursor: nextCursor }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Fetch failed');
        }

        const data = await res.json();
        const batch: OpenTxEvent[] = data.events;
        currentEvents = [...currentEvents, ...batch];

        setEvents(prev => [...prev, ...batch]);

        nextCursor = data.nextCursor;
      }

      setProgress('Processing and deduplicating...');

      const uniqueMap = new Map<string, OpenTxEvent>();
      for (const e of currentEvents) {
        if (!e.txHash) {
          uniqueMap.set(Math.random().toString(), e);
          continue;
        }
        const existing = uniqueMap.get(e.txHash);
        if (!existing) {
          uniqueMap.set(e.txHash, e);
        } else {
          if (existing.txType === 'fee' && e.txType === 'transfer') {
            uniqueMap.set(e.txHash, e);
          }
        }
      }

      const deduped = Array.from(uniqueMap.values());
      deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(deduped);
      setProgress('Done!');

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProgress('Cancelled');
      } else {
        setError(err.message);
        setProgress('Error');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelFetch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const downloadCsv = (mode: 'strict' | 'enriched') => {
    const csvContent = generateCsv(events, mode);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `opentx_${chain}_${address}_${mode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30">
      <Header />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-12">

          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
              Transaction History, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Normalized.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Fetch raw blockchain data and export perfectly formatted CSVs for tax software.
              Open-source, private, and direct from on-chain sources.
            </p>
          </div>

          {/* Main Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
            <div className="relative bg-slate-900 rounded-xl border border-white/10 p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Chain Select */}
                <div className="md:col-span-4 space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Blockchain</label>
                  <div className="relative">
                    <select
                      value={chain}
                      onChange={(e) => setChain(e.target.value)}
                      className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="polkadot">Polkadot (DOT)</option>
                      <option value="kusama" disabled>Kusama (Coming Soon)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Address Input */}
                <div className="md:col-span-6 space-y-2">
                  <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Wallet Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter wallet address (e.g. 15oF4...)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-mono transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Fetch Button */}
                <div className="md:col-span-2 flex items-end">
                  {!loading ? (
                    <button
                      onClick={fetchTransactions}
                      disabled={!address}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white h-[50px] rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group/btn"
                    >
                      <span>Fetch</span>
                      <ArrowDownToLine className="w-4 h-4 group-hover/btn:translate-y-0.5 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={cancelFetch}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 h-[50px] rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <span>Stop</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              {(loading || error || progress) && (
                <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 text-sm ${error ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {error && <AlertCircle className="w-4 h-4" />}
                  {!loading && !error && <CheckCircle2 className="w-4 h-4" />}
                  <span className="font-medium">{error || progress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Area */}
          {events.length > 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    {events.length.toLocaleString()} Transactions Found
                  </h2>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => downloadCsv('strict')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-slate-700 group"
                  >
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    <span>Awaken CSV</span>
                  </button>
                  <button
                    onClick={() => downloadCsv('enriched')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Enriched CSV</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-900/50 shadow-2xl">
                <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 sticky top-0 z-10 box-decoration-clone">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-400 border-b border-white/10 bg-slate-950">Date (UTC)</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 border-b border-white/10 bg-slate-950">Type</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 border-b border-white/10 bg-slate-950">Movement</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 border-b border-white/10 bg-slate-950">Fee</th>
                        <th className="px-6 py-4 font-semibold text-slate-400 border-b border-white/10 bg-slate-950">Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {events.map((e, i) => (
                        <tr key={i} className="group hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">{e.date}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${e.txType === 'transfer'
                              ? (e.receivedQty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                              {e.txType?.toUpperCase() || 'OTHER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <div className="flex flex-col">
                              {e.receivedQty && <span className="text-emerald-400 text-xs">+ {e.receivedQty} {e.receivedCurrency}</span>}
                              {e.sentQty && <span className="text-slate-300 text-xs">- {e.sentQty} {e.sentCurrency}</span>}
                              {!e.receivedQty && !e.sentQty && <span className="text-slate-600">-</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-red-400/80">
                            {e.feeAmount && e.feeAmount !== '0' ? `${e.feeAmount} DOT` : '-'}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <a
                              href={e.explorerUrl}
                              target="_blank"
                              className="text-blue-500 hover:text-blue-400 hover:underline decoration-blue-500/30 underline-offset-4 transition-colors"
                            >
                              {e.txHash?.substring(0, 8)}...
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}


