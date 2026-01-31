'use client';

import { useState, useRef } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { generateCsv } from '@/csv/awaken';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Analytics } from './components/Analytics';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { Search, ArrowRight, Loader2, Download, CheckCircle, Info, ShieldCheck, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('polkadot');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [events, setEvents] = useState<OpenTxEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTransactions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError(null);
    setEvents([]);
    setProgress('Initializing connection...');
    setCurrentPage(1);
    setShowAll(false);

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
          body: JSON.stringify({ address, cursor: nextCursor, chain }),
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

      // Dedup using composite key: hash + from + to + amounts
      // This preserves distinct transfers that share the same txHash (e.g., staking rewards)
      const uniqueMap = new Map<string, OpenTxEvent>();
      for (const e of currentEvents) {
        // Create a unique key from transfer details, not just hash
        const key = `${e.txHash || Math.random()}_${e.from || ''}_${e.to || ''}_${e.receivedQty || ''}_${e.sentQty || ''}`;

        const existing = uniqueMap.get(key);
        if (!existing) {
          uniqueMap.set(key, e);
        } else {
          // Prefer transfer over fee-only entries
          if (existing.txType === 'fee' && e.txType === 'transfer') {
            uniqueMap.set(key, e);
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
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-pink-500/30">
      <Header />

      <main className="flex-grow pt-32 pb-24 px-6 md:px-12 w-full max-w-[1920px] mx-auto">

        {/* Layout: Single column on mobile, grid on desktop */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12 lg:gap-24 items-center lg:items-start">

          {/* Left Column: Form & Hero */}
          <div className="lg:col-span-5 space-y-12 lg:pl-8 w-full max-w-xl lg:max-w-none">

            {/* Hero Text - Centered on mobile, left on desktop */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold tracking-wide uppercase">
                <Zap className="w-3 h-3" />
                <span>v1.0 Now Live</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                Transactions <br />
                <span className="text-[#e50179]">Simplified on Polkadot</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                Export your Polkadot transaction history for tax reporting and accounting.
                Generate CSVs instantly without connecting your wallet.
              </p>

              {/* Polkadot Badge */}
              <div className="flex items-center gap-3 justify-center lg:justify-start pt-2">
                <span className="text-xs text-slate-600 uppercase tracking-wider">Powered by</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg">
                  <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" fill="#E6007A" />
                    <circle cx="16" cy="9" r="2.5" fill="white" />
                    <circle cx="23" cy="13" r="2.5" fill="white" />
                    <circle cx="23" cy="19" r="2.5" fill="white" />
                    <circle cx="16" cy="23" r="2.5" fill="white" />
                    <circle cx="9" cy="19" r="2.5" fill="white" />
                    <circle cx="9" cy="13" r="2.5" fill="white" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Polkadot</span>
                </div>
              </div>
            </div>

            {/* Input Form - Clean & Minimal */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-1 overflow-hidden">
              <form onSubmit={fetchTransactions} className="flex flex-col md:flex-row gap-4 p-2">

                {/* Chain Select */}
                <div className="relative min-w-[140px]">
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="w-full h-14 pl-4 pr-10 bg-slate-950 rounded-xl border border-transparent hover:border-white/10 focus:border-pink-500/50 outline-none text-slate-200 font-medium appearance-none transition-colors"
                  >
                    {SUPPORTED_CHAINS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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
                    className="w-full h-14 pl-12 pr-4 bg-slate-950 rounded-xl border border-transparent hover:border-white/10 focus:border-pink-500/50 outline-none text-slate-200 placeholder:text-slate-600 font-mono transition-colors"
                  />
                </div>

                {/* Action Button */}
                {!loading ? (
                  <button
                    type="submit"
                    disabled={!address}
                    className="h-14 px-8 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 whitespace-nowrap"
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
                    <span className="text-pink-400 flex items-center gap-2">
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
                  <CheckCircle className="w-5 h-5 text-pink-400" />
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

                <Analytics events={events} chain={chain} address={address} />

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
                <div className="flex-grow bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Scrollable Table Area */}
                  <div className="max-h-[400px] overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
                        {(showAll ? events : events.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)).map((e, i) => (
                          <tr key={i} className="group hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">{e.date.split(' ')[0]}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide ${e.txType === 'transfer'
                                ? 'bg-pink-500/10 text-pink-400'
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
                                className="text-slate-600 hover:text-pink-400 transition-colors"
                              >
                                {e.txHash?.substring(0, 6)}...
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {!showAll && events.length > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/50">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-slate-400 px-2">
                          Page {currentPage} of {Math.ceil(events.length / ITEMS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(events.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage >= Math.ceil(events.length / ITEMS_PER_PAGE)}
                          className="p-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => setShowAll(true)}
                        className="text-sm text-[#e50179] hover:underline"
                      >
                        Show All ({events.length})
                      </button>
                    </div>
                  )}

                  {/* Show Less Button when showing all */}
                  {showAll && events.length > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-white/10 flex justify-end bg-slate-950/50">
                      <button
                        onClick={() => { setShowAll(false); setCurrentPage(1); }}
                        className="text-sm text-slate-400 hover:text-white"
                      >
                        Show Less
                      </button>
                    </div>
                  )}
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

      {/* Awaken Tax Recommendation Section */}
      <section className="relative overflow-hidden bg-slate-950 py-24 px-6 md:px-12">
        <div className="absolute inset-0 bg-[#e50179]/5" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
            Recommended Partner
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight flex flex-wrap items-center justify-center gap-4">
              <span>Import your CSV to</span>
              <span className="inline-flex items-center gap-3">
                <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="90" fill="#e50179" />
                  <path d="M70 90 L90 110 L130 70" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span className="text-[#e50179]">Awaken Tax</span>
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              30,000+ crypto traders use Awaken Tax to save time & money.
              Built for DeFi power users with support for 10,000+ dApps across 55+ countries.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl text-left">
              <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Fast & Accurate</h3>
              <p className="text-sm text-slate-500">Process thousands of transactions in minutes with industry-leading cost-basis accuracy.</p>
            </div>

            <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl text-left">
              <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Human Support</h3>
              <p className="text-sm text-slate-500">Get help from crypto-native experts who understand complex onchain activity.</p>
            </div>

            <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl text-left">
              <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">55+ Countries</h3>
              <p className="text-sm text-slate-500">Generate tax forms for US, UK, Canada, Australia, Germany and 50+ more countries.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://awaken.tax/signup?ref=3kb7cugk"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-8 py-4 bg-[#e50179] hover:opacity-90 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-[#e50179]/20"
            >
              Try Awaken Tax Free
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <span className="text-sm text-slate-500">No credit card required</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
