'use client';

import { useState, useRef } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { generateCsv } from '@/csv/awaken';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Analytics } from './components/Analytics';
import { Search, ArrowRight, Loader2, Download, CheckCircle, Info, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('polkadot');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [events, setEvents] = useState<OpenTxEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTransactions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError(null);
    setEvents([]);
    setProgress('Initializing connection...');

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

        const [phase, page] = nextCursor.split(':');
        setProgress(`Scanning ${phase} (Page ${parseInt(page) + 1})...`);

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

      setProgress('Normalizing data...');

      // Dedup
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
      setProgress('Complete');

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

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 w-full max-w-[1920px] mx-auto">

        {/* Layout: Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">

          {/* Left Column: Form & Hero */}
          <div className="lg:col-span-5 space-y-12 lg:pl-8">

            {/* Hero Text - Left Aligned */}
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
                <Zap className="w-3 h-3" />
                <span>v1.0 Now Live</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                Transactions, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Simplified.</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                The fastest way to export raw blockchain data for tax reporting.
                Generate Awaken-compatible CSVs instantly without connecting your wallet.
              </p>
            </div>

            {/* Input Form - Clean & Minimal */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-1 overflow-hidden">
              <form onSubmit={fetchTransactions} className="flex flex-col md:flex-row gap-4 p-2">

                {/* Chain Select */}
                <div className="relative min-w-[140px]">
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 bg-slate-950 rounded-xl border border-transparent hover:border-white/10 focus:border-blue-500/50 outline-none text-slate-200 font-medium appearance-none transition-colors"
                  >
                    <option value="polkadot">Polkadot</option>
                    <option value="kusama" disabled>Kusama</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Address Input */}
                <div className="flex-grow relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Paste wallet address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-slate-950 rounded-xl border border-transparent hover:border-white/10 focus:border-blue-500/50 outline-none text-slate-200 placeholder:text-slate-600 font-mono transition-colors"
                  />
                </div>

                {/* Action Button */}
                {!loading ? (
                  <button
                    type="submit"
                    disabled={!address}
                    className="h-14 px-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span>Scan</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cancelFetch}
                    className="h-14 px-8 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 text-slate-400 rounded-xl font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Stop</span>
                  </button>
                )}
              </form>

              {/* Progress / Status Inline */}
              {(loading || progress || error) && (
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-3 text-sm">
                  {error ? (
                    <span className="text-red-400 flex items-center gap-2"><Info className="w-4 h-4" /> {error}</span>
                  ) : (
                    <span className="text-blue-400 flex items-center gap-2">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {progress}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Features / Trust Badges */}
            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3>Private & Secure</h3>
                </div>
                <p className="text-sm text-slate-500">No data storage, no tracking. Your wallet keys never leave your device.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <h3>Audit Ready</h3>
                </div>
                <p className="text-sm text-slate-500">Strict CSV mode ensures 100% compatibility with accounting tools.</p>
              </div>
            </div>

          </div>

          {/* Right Column: Results Table (or Empty State/Preview) */}
          <div className="lg:col-span-7 w-full h-full min-h-[400px]">
            {events.length > 0 ? (
              <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                <Analytics events={events} chain={chain} />

                {/* Results Header */}
                <div className="flex flex-wrap justify-between items-end gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Results</h2>
                    <p className="text-slate-400 text-sm">Found {events.length.toLocaleString()} transactions.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadCsv('strict')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700 flex items-center gap-2"
                    >
                      <span>Awaken CSV</span>
                    </button>
                    <button
                      onClick={() => downloadCsv('enriched')}
                      className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg text-sm font-bold transition-all shadow-lg shadow-white/10 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Full</span>
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-grow bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
                  {/* Scrollable Table Area */}
                  <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 font-semibold text-slate-400 w-32">Date</th>
                          <th className="px-6 py-4 font-semibold text-slate-400 w-24">Type</th>
                          <th className="px-6 py-4 font-semibold text-slate-400">Activity</th>
                          <th className="px-6 py-4 font-semibold text-slate-400 text-right">Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {events.map((e, i) => (
                          <tr key={i} className="group hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">{e.date.split(' ')[0]}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide ${e.txType === 'transfer'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-slate-800 text-slate-400'
                                }`}>
                                {e.txType}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              <div className="flex flex-col gap-0.5">
                                {e.receivedQty && <span className="text-emerald-400 text-xs">+ {e.receivedQty} {e.receivedCurrency}</span>}
                                {e.sentQty && <span className="text-slate-300 text-xs">- {e.sentQty} {e.sentCurrency}</span>}
                                {e.feeAmount && e.feeAmount !== '0' && <span className="text-red-400/60 text-[10px]">Fee: {e.feeAmount} DOT</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-right">
                              <a
                                href={e.explorerUrl}
                                target="_blank"
                                className="text-slate-600 hover:text-blue-400 transition-colors"
                              >
                                {e.txHash?.substring(0, 6)}...
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State / Placeholder */
              <div className="h-full min-h-[400px] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-white/[0.02]">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                  <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-medium text-slate-300 mb-2">Ready to Scan</h3>
                <p className="text-slate-500 max-w-sm">
                  Enter a Polkadot address to see your transaction history populate here in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
