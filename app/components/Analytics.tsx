'use client';

import { useMemo, useState, useEffect } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Wallet, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalyticsProps {
    events: OpenTxEvent[];
    chain: string;
}

export function Analytics({ events, chain }: AnalyticsProps) {
    const [price, setPrice] = useState<number | null>(null);

    // Fetch Price (Simple implementation)
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                // Determine CoinGecko ID
                const coinId = chain === 'polkadot' ? 'polkadot' : 'kusama';
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                const data = await res.json();
                setPrice(data[coinId]?.usd || null);
            } catch (e) {
                console.error('Failed to fetch price:', e);
            }
        };
        fetchPrice();
    }, [chain]);

    // Calculate Balance History & Stats
    const { chartData, currentBalance, totalSent, totalReceived } = useMemo(() => {
        let balance = 0;
        let sent = 0;
        let received = 0;

        // Process chronologically (Oldest first)
        const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const history = sorted.map(e => {
            const inAmt = parseFloat(e.receivedQty || '0');
            const outAmt = parseFloat(e.sentQty || '0');
            const fee = parseFloat(e.feeAmount || '0');

            received += inAmt;
            sent += outAmt; // Fee is usually included in sent quantity or separate? 
            // In OpenTxEvent normalization, sentQty is the transfer amount. 
            // If user paid fee, it's separate feeAmount.

            // Note: Simplification for chart. 
            // Real balance logic needs to know initial balance or assume 0 start. 
            // We assume 0 start for "Account History" or relative change.
            balance = balance + inAmt - outAmt - (e.txType === 'fee' ? fee : 0) - (e.txType === 'transfer' && e.sentQty ? fee : 0);

            return {
                date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                fullDate: e.date,
                balance: balance < 0 ? 0 : balance, // Prevent negative if history partial
            };
        });

        // Filter to reasonable points for chart if too large? 
        // Recharts handles ~1000 ok.

        return {
            chartData: history,
            currentBalance: balance,
            totalSent: sent,
            totalReceived: received
        };
    }, [events]);

    const netWorth = price && currentBalance ? (currentBalance * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '---';
    const netFlow = totalReceived - totalSent;

    if (events.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">

            {/* Stats Column */}
            <div className="lg:col-span-1 space-y-4">
                {/* Balance Card */}
                <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-16 h-16 text-blue-400" />
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium mb-1">Current Balance</h3>
                    <div className="text-3xl font-bold text-white tracking-tight flex items-end gap-2">
                        {currentBalance.toFixed(4)} <span className="text-sm text-slate-500 mb-1 font-medium">DOT</span>
                    </div>
                    {price && (
                        <div className="mt-2 text-emerald-400 text-sm font-medium flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {netWorth} USD
                        </div>
                    )}
                </div>

                {/* Flow Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase mb-2">
                            <ArrowDownRight className="w-3 h-3" /> Received
                        </div>
                        <div className="text-lg font-semibold text-slate-200">
                            {totalReceived.toFixed(2)}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                            <ArrowUpRight className="w-3 h-3" /> Sent
                        </div>
                        <div className="text-lg font-semibold text-slate-200">
                            {totalSent.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Column */}
            <div className="lg:col-span-2 p-6 bg-slate-900/50 border border-white/10 rounded-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        Balance History
                    </h3>
                    <div className="text-xs text-slate-500 font-mono">
                        {events.length} Events
                    </div>
                </div>

                <div className="flex-grow w-full min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val.toFixed(1)}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#bae6fd' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorBal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
