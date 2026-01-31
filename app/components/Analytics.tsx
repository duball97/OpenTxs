'use client';

import { useMemo, useState, useEffect } from 'react';
import { OpenTxEvent } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Info, HelpCircle, RefreshCw } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/chains';

interface AnalyticsProps {
    events: OpenTxEvent[];
    chain: string;
    address: string;
}

type AccountState = {
    freeDot: string;
    reservedDot: string;
    lockedDot: string;
    totalDot: string;
} | null;

export function Analytics({ events, chain, address }: AnalyticsProps) {
    const [price, setPrice] = useState<number | null>(null);
    const [accountState, setAccountState] = useState<AccountState>(null);
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountError, setAccountError] = useState<string | null>(null);

    // Fetch Price
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                // Mapping some common chains to CoinGecko IDs, fallback to polkadot
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

    // Fetch On-Chain Account State
    const fetchAccountState = async () => {
        if (!address) return;
        setAccountLoading(true);
        setAccountError(null);
        try {
            const res = await fetch('/api/polkadot/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, chain }),
            });
            const data = await res.json();
            if (data.error && !data.totalDot) {
                setAccountError(data.error);
            } else {
                setAccountState(data);
            }
        } catch (e: any) {
            setAccountError(e.message || 'Failed to fetch');
        } finally {
            setAccountLoading(false);
        }
    };

    useEffect(() => {
        if (address && events.length > 0) {
            fetchAccountState();
        }
    }, [address, events.length]);

    // Calculate Tax-Relevant Balance from Events
    const { taxBalance, totalReceived, totalSent, totalFees, chartData } = useMemo(() => {
        let received = 0;
        let sent = 0;
        let fees = 0;
        let runningBalance = 0;

        const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const history = sorted.map(e => {
            const inAmt = parseFloat(e.receivedQty || '0');
            const outAmt = parseFloat(e.sentQty || '0');
            const feeAmt = parseFloat(e.feeAmount || '0');

            received += inAmt;
            sent += outAmt;
            fees += feeAmt;

            runningBalance = runningBalance + inAmt - outAmt - feeAmt;

            return {
                date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                balance: Math.max(0, runningBalance),
            };
        });

        return {
            taxBalance: received - sent - fees,
            totalReceived: received,
            totalSent: sent,
            totalFees: fees,
            chartData: history,
        };
    }, [events]);

    const currentBalanceUsd = accountState && price
        ? (parseFloat(accountState.totalDot) * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : null;

    const taxBalanceUsd = price
        ? (taxBalance * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : null;

    if (events.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">

            {/* Two Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Current Balance (On-chain) */}
                <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-slate-300 text-sm font-medium">Current Balance</h3>
                            <div className="relative group/tooltip">
                                <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20">
                                    On-chain total from Polkadot account state (free + reserved; locks may reduce spendable). This matches explorer balances.
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">On-chain</span>
                    </div>

                    {accountLoading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : accountError ? (
                        <div className="space-y-2">
                            <span className="text-slate-500 text-sm">Unavailable</span>
                            <button onClick={fetchAccountState} className="text-xs text-[#e50179] hover:underline flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                        </div>
                    ) : accountState ? (
                        <>
                            <div className="text-3xl font-bold text-white tracking-tight flex items-end gap-2">
                                {parseFloat(accountState.totalDot).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                <span className="text-sm text-slate-500 mb-1 font-medium">{SUPPORTED_CHAINS.find(c => c.id === chain)?.symbol || 'DOT'}</span>
                            </div>
                            {currentBalanceUsd && (
                                <div className="mt-2 text-emerald-400 text-sm font-medium">
                                    ≈ {currentBalanceUsd}
                                </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                <div>Free: <span className="text-slate-300">{parseFloat(accountState.freeDot).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                                <div>Reserved: <span className="text-slate-300">{parseFloat(accountState.reservedDot).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                            </div>
                        </>
                    ) : (
                        <span className="text-slate-500 text-sm">--</span>
                    )}
                </div>

                {/* Tax-Relevant Balance (Transfer-derived) */}
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
                        <span className="text-sm text-slate-500 mb-1 font-medium">{SUPPORTED_CHAINS.find(c => c.id === chain)?.symbol || 'DOT'}</span>
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
            </div>

            {/* Balance History Chart */}
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
                                itemStyle={{ color: '#e50179' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
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
