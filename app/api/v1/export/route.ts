import { NextRequest, NextResponse } from 'next/server';
import { fetchTransfers, fetchExtrinsics } from '@/adapters/polkadot/subscan';
import { normalizeTransfer, normalizeExtrinsic } from '@/adapters/polkadot/normalize';
import { OpenTxEvent } from '@/lib/types';
import { generateCsv } from '@/csv/awaken';

export const dynamic = 'force-dynamic'; // Prevent caching so we get fresh data
export const maxDuration = 60; // Allow 60s for fetching multiple pages (Vercel Pro/Hobby limits apply)

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chain = searchParams.get('chain');
    const address = searchParams.get('address');
    const format = searchParams.get('format') || 'json'; // json | csv

    if (!chain || chain !== 'polkadot') {
        return NextResponse.json({ error: 'Invalid or missing chain. Only "polkadot" is supported.' }, { status: 400 });
    }

    if (!address) {
        return NextResponse.json({ error: 'Missing address parameter.' }, { status: 400 });
    }

    try {
        let allEvents: OpenTxEvent[] = [];
        let transfersPage = 0;
        let extrinsicsPage = 0;
        let hasMoreTransfers = true;
        let hasMoreExtrinsics = true;
        const ROW_LIMIT = 100;
        const MAX_PAGES = 5; // Safety cap to prevent timeouts

        // Fetch Transfers Loop
        while (hasMoreTransfers && transfersPage < MAX_PAGES) {
            const tData = await fetchTransfers(address, transfersPage, ROW_LIMIT);
            if (tData.transfers && tData.transfers.length > 0) {
                const normalized = tData.transfers.map(t => normalizeTransfer(t, address));
                allEvents = [...allEvents, ...normalized];
                if (tData.transfers.length < ROW_LIMIT) hasMoreTransfers = false;
                else transfersPage++;
            } else {
                hasMoreTransfers = false;
            }
        }

        // Fetch Extrinsics Loop
        while (hasMoreExtrinsics && extrinsicsPage < MAX_PAGES) {
            const eData = await fetchExtrinsics(address, extrinsicsPage, ROW_LIMIT);
            if (eData.extrinsics && eData.extrinsics.length > 0) {
                const normalized = eData.extrinsics.map(e => normalizeExtrinsic(e, address));
                allEvents = [...allEvents, ...normalized];
                if (eData.extrinsics.length < ROW_LIMIT) hasMoreExtrinsics = false;
                else extrinsicsPage++;
            } else {
                hasMoreExtrinsics = false;
            }
        }

        // Deduplication Logic
        const uniqueMap = new Map<string, OpenTxEvent>();
        for (const e of allEvents) {
            if (!e.txHash) {
                uniqueMap.set(Math.random().toString(), e);
                continue;
            }
            const existing = uniqueMap.get(e.txHash);
            if (!existing) {
                uniqueMap.set(e.txHash, e);
            } else {
                // Keep Transfer over Fee
                if (existing.txType === 'fee' && e.txType === 'transfer') {
                    uniqueMap.set(e.txHash, e);
                }
            }
        }

        const deduped = Array.from(uniqueMap.values());
        // Sort Date Descending
        deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Return JSON
        if (format === 'json') {
            return NextResponse.json({
                data: deduped,
                meta: {
                    count: deduped.length,
                    chain,
                    address,
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Return CSV
        if (format === 'csv') {
            const csvContent = generateCsv(deduped, 'strict'); // Default to strict for now
            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="opentx_${chain}_${address}.csv"`,
                },
            });
        }

        return NextResponse.json({ error: 'Invalid format. Use "json" or "csv".' }, { status: 400 });

    } catch (error: any) {
        console.error('API Export Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
