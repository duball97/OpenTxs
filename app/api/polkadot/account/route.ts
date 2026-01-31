import { NextRequest, NextResponse } from 'next/server';
import { fetchAccount } from '@/adapters/polkadot/subscan';
import { SUPPORTED_CHAINS } from '@/lib/chains';

const DOT_DECIMALS = 10;

function formatDot(plancks: string): string {
    if (!plancks || plancks === '0') return '0';
    if (plancks.includes('.')) return plancks;

    try {
        const val = BigInt(plancks);
        const divisor = BigInt(10 ** DOT_DECIMALS);
        const integer = val / divisor;
        const remainder = val % divisor;
        const remStr = remainder.toString().padStart(DOT_DECIMALS, '0').replace(/0+$/, '');
        return remStr ? `${integer}.${remStr}` : `${integer}`;
    } catch {
        return plancks;
    }
}

// Cache for account data (10s TTL for account state)
const accountCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 1000; // 10 seconds

export const dynamic = 'force-dynamic';

export type PolkadotAccountState = {
    address: string;
    freeDot: string;
    reservedDot: string;
    lockedDot: string;
    totalDot: string;
    source: 'subscan';
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, chain = 'polkadot' } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        const chainConfig = SUPPORTED_CHAINS.find(c => c.id === chain);
        if (!chainConfig) {
            return NextResponse.json({ error: `Unsupported chain: ${chain}` }, { status: 400 });
        }

        const cacheKey = `${chain}:${address}`;
        // Check cache
        const cached = accountCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const account = await fetchAccount(address, chainConfig.subscanHost);

        // If account data unavailable, return a graceful response
        if (!account) {
            return NextResponse.json({
                error: 'Account balance unavailable for this network',
                freeDot: null,
                reservedDot: null,
                lockedDot: null,
                totalDot: null,
            });
        }

        // Extract balance fields from Subscan response
        const freeDot = formatDot(account.balance || '0');
        const reservedDot = formatDot(account.reserved || '0');
        const lockedDot = formatDot(account.lock || account.locked || '0');

        // Calculate total (free + reserved)
        const freeNum = parseFloat(freeDot) || 0;
        const reservedNum = parseFloat(reservedDot) || 0;
        const totalDot = (freeNum + reservedNum).toString();

        const result: PolkadotAccountState = {
            address,
            freeDot,
            reservedDot,
            lockedDot,
            totalDot,
            source: 'subscan',
        };

        // Cache result
        accountCache.set(cacheKey, { data: result, timestamp: Date.now() });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Account API Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to fetch account state',
            freeDot: null,
            reservedDot: null,
            lockedDot: null,
            totalDot: null,
        }, { status: 500 });
    }
}
