'use client';

import { useMemo, useState, useEffect } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, HelpCircle } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/chains';

interface AnalyticsProps {
    events: OpenTxEvent[];
    chain: string;
    address: string;
}

export function Analytics({ events, chain, address }: AnalyticsProps) {
    const [price, setPrice] = useState<number | null>(null);

    // Fetch Price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const geckoMap: Record<string, string> = {
                    'polkadot': 'polkadot',
                    'kusama': 'kusama',
                    'astar': 'astar',
                    'acala': 'acala',
                    'moonbeam': 'moonbeam',
                    'moonriver': 'moonriver',
                    'hydration': 'hydradx',
                    'phala': 'phala-network',
                    'centrifuge': 'centrifuge',
                };
                const coinId = geckoMap[chain] || 'polkadot';
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                const data = await res.json();
                setPrice(data[coinId]?.usd || null);
            } catch (e) {
                console.error('Failed to fetch price:', e);
            }
        };
        fetchPrice();
    }, [chain]);

    // Calculate Tax-Relevant Balance and Monthly Chart Data
    const { taxBalance, totalReceived, totalSent, totalFees, chartData } = useMemo(() => {
        let received = 0;
        let sent = 0;
        let fees = 0;

        const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Aggregate by month for the chart (with year to avoid overlap)
        const monthlyData = new Map<string, number>();

        for (const e of sorted) {
            const inAmt = parseFloat(e.receivedQty || '0');
            const outAmt = parseFloat(e.sentQty || '0');
            const feeAmt = parseFloat(e.feeAmount || '0');

            received += inAmt;
            sent += outAmt;
            fees += feeAmt;

            // Create month key with year (e.g., "Jan '24")
            const date = new Date(e.date);
            const monthKey = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            const activity = inAmt + outAmt; // Total transfer volume
            monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + activity);
        }

        const chartData = Array.from(monthlyData.entries()).map(([date, volume]) => ({
            date,
            volume: parseFloat(volume.toFixed(2)),
        }));

        return {
            taxBalance: received - sent - fees,
            totalReceived: received,
            totalSent: sent,
            totalFees: fees,
            chartData,
        };
    }, [events]);

    const taxBalanceUsd = price
        ? (taxBalance * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : null;

    const symbol = SUPPORTED_CHAINS.find(c => c.id === chain)?.symbol || 'DOT';

    if (events.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">

            {/* Tax-Relevant Balance Card (Full Width) */}
            <div className="p-6 bg-slate-900/50 border-[#e50179]/20 border rounded-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-slate-300 text-sm font-medium">Tax-Relevant Balance</h3>
                        <div className="relative group/tooltip">
                            <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20">
                                Derived from transfer events only (what openTx exports to Awaken). Does not include staking, reserves, locks, or internal pallet movements.
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-[#e50179] uppercase tracking-wider">CSV-based</span>
                </div>

                <div className="text-3xl font-bold text-white tracking-tight flex items-end gap-2">
                    {taxBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="text-sm text-slate-500 mb-1 font-medium">{symbol}</span>
                </div>
                {taxBalanceUsd && (
                    <div className="mt-2 text-[#e50179] text-sm font-medium">
                        ≈ {taxBalanceUsd}
                    </div>
                )}
                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>In: <span className="text-emerald-400">+{totalReceived.toFixed(2)}</span></div>
                    <div>Out: <span className="text-slate-300">-{totalSent.toFixed(2)}</span></div>
                    <div>Fees: <span className="text-red-400/60">-{totalFees.toFixed(4)}</span></div>
                </div>
            </div>

            {/* Transfer Volume Chart */}
            <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#e50179]" />
                        Transfer History
                    </h3>
                    <div className="text-xs text-slate-500 font-mono">
                        {events.length} Events
                    </div>
                </div>

                <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <XAxis
                                dataKey="date"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={40}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#e50179' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                formatter={(value) => [`${Number(value || 0).toFixed(2)} ${symbol}`, 'Volume']}
                            />
                            <Area
                                type="monotone"
                                dataKey="volume"
                                stroke="#e50179"
                                strokeWidth={2}
                                fillOpacity={0.1}
                                fill="#e50179"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
