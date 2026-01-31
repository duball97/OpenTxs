import { NextRequest, NextResponse } from 'next/server';
import { fetchTransfers } from '../../../../adapters/polkadot/subscan';
import { normalizeTransfer } from '../../../../adapters/polkadot/normalize';
import { OpenTxEvent } from '../../../../lib/types';

// Force dynamic to prevent caching issues 
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, cursor } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Cursor format: "transfers:page" e.g. "transfers:0"
        // We now ONLY fetch transfers (no extrinsics), as per user requirement:
        // "If a row does not represent a human-meaningful movement of value, do not emit it."

        const currentCursor = cursor || 'transfers:0';
        const [phase, pageStr] = currentCursor.split(':');
        const page = parseInt(pageStr, 10);
        const row = 50; // Batch size

        let events: OpenTxEvent[] = [];
        let nextCursor: string | null = null;

        if (phase === 'transfers') {
            const data = await fetchTransfers(address, page, row);
            const transfers = data.transfers || [];

            // Only include successful transfers that actually moved value
            const validTransfers = transfers.filter(t => t.success);
            events = validTransfers.map(t => normalizeTransfer(t, address));

            // Determine next cursor
            if (transfers.length === row) {
                nextCursor = `transfers:${page + 1}`;
            } else {
                // Done with all transfers
                nextCursor = null;
            }
        } else {
            return NextResponse.json({ error: 'Invalid cursor phase' }, { status: 400 });
        }

        return NextResponse.json({
            events,
            nextCursor,
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
