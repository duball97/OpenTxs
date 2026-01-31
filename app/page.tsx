'use client';

import { useState, useRef } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { generateCsv } from '@/csv/awaken';

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

    // Abort controller for cancellation
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

        // Optional: Update UI incrementally (might be slow if too many re-renders, but good for feedback)
        // setEvents(currentEvents); // Let's wait until end or deduping?
        // User requested "Progress indicator", so incrementally showing count is nice.
        setEvents(prev => [...prev, ...batch]);

        nextCursor = data.nextCursor;
      }

      setProgress('Processing and deduplicating...');

      // Deduplication Logic
      const uniqueMap = new Map<string, OpenTxEvent>();

      // We process accumulated "events" from state? Or "currentEvents" local var?
      // currentEvents has all raw batches.
      for (const e of currentEvents) {
        if (!e.txHash) {
          // No hash? Keep it.
          uniqueMap.set(Math.random().toString(), e);
          continue;
        }

        const existing = uniqueMap.get(e.txHash);
        if (!existing) {
          uniqueMap.set(e.txHash, e);
        } else {
          // Priority: Transfer > Fee
          if (existing.txType === 'fee' && e.txType === 'transfer') {
            uniqueMap.set(e.txHash, e);
          }
          // If existing is transfer, keep it.
        }
      }

      const deduped = Array.from(uniqueMap.values());

      // Sort by Date Descending
      deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(deduped);
      setProgress('Done!');

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProgress('Cancelled.');
      } else {
        setError(err.message);
        setProgress('Error.');
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
    <main className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
              Ox
            </div>
            <h1 className="text-3xl font-bold tracking-tight">openTx</h1>
          </div>
          <a href="https://github.com/duball/OpenTxs" target="_blank" className="text-slate-400 hover:text-white transition-colors">
            GitHub
          </a>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 flex flex-col md:flex-row gap-4 items-end md:items-center shadow-xl">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Blockchain</label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="polkadot">Polkadot (DOT)</option>
              <option value="kusama" disabled>Kusama (Coming Soon)</option>
            </select>
          </div>

          <div className="flex-[2] space-y-2 w-full">
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Wallet Address</label>
            <input
              type="text"
              placeholder="15oF4..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
          </div>

          <div className="flex space-x-3 w-full md:w-auto pt-6 md:pt-0">
            {!loading ? (
              <button
                onClick={fetchTransactions}
                disabled={!address}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20"
              >
                Fetch All
              </button>
            ) : (
              <button
                onClick={cancelFetch}
                className="flex-1 md:flex-none bg-red-500 hover:bg-red-400 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-red-900/20"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Status Area */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg">
            Error: {error}
          </div>
        )}

        {loading && (
          <div className="animate-pulse flex items-center space-x-3 text-blue-400">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{progress}</span>
          </div>
        )}

        {/* Results */}
        {events.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-200">
                Found {events.length} Transactions
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadCsv('strict')}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600"
                >
                  Download CSV (Strict)
                </button>
                <button
                  onClick={() => downloadCsv('enriched')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Download CSV (Enriched)
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-slate-400 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Sent</th>
                      <th className="px-6 py-4 font-medium">Received</th>
                      <th className="px-6 py-4 font-medium">Fee</th>
                      <th className="px-6 py-4 font-medium">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {events.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300 font-mono whitespace-nowrap">{e.date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${e.txType === 'transfer'
                            ? (e.receivedQty ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
                            : 'bg-slate-700 text-slate-300 border-slate-600'
                            }`}>
                            {e.txType?.toUpperCase() || 'OTHER'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono">
                          {e.sentQty ? `${e.sentQty} ${e.sentCurrency}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-mono">
                          {e.receivedQty ? <span className="text-emerald-400">+{e.receivedQty} {e.receivedCurrency}</span> : '-'}
                        </td>
                        <td className="px-6 py-4 text-red-300/80 font-mono text-xs">
                          {e.feeAmount && e.feeAmount !== '0' ? `${e.feeAmount} DOT` : ''}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-blue-400 truncate max-w-[150px]">
                          <a href={e.explorerUrl} target="_blank" className="hover:underline">
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
  );
}
