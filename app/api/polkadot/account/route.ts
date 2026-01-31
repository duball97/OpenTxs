import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://polkadot.api.subscan.io';
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

// Cache for account data (30s TTL)
const accountCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

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
        const { address } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Check cache
        const cached = accountCache.get(address);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const apiKey = process.env.SUBSCAN_API_KEY;

        // Fetch account info from Subscan
        const response = await fetch(`${BASE_URL}/api/v2/scan/account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'X-API-Key': apiKey } : {}),
            },
            body: JSON.stringify({ address }),
        });

        if (!response.ok) {
            throw new Error(`Subscan API error: ${response.status}`);
        }

        const json = await response.json();

        if (json.code !== 0) {
            throw new Error(json.message || 'Subscan API error');
        }

        const account = json.data;

        // Extract balance fields from Subscan response
        // Subscan returns balance in planck format
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
        accountCache.set(address, { data: result, timestamp: Date.now() });

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
