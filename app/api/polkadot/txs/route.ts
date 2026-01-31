import { NextRequest, NextResponse } from 'next/server';
import { fetchTransfers, fetchExtrinsics } from '../../../../adapters/polkadot/subscan';
import { normalizeTransfer, normalizeExtrinsic } from '../../../../adapters/polkadot/normalize';
import { OpenTxEvent } from '../../../../lib/types';

// Force dynamic to prevent caching issues with search params? 
// Actually POST request is dynamic by default.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, cursor } = body;

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        // Cursor format: "phase:page" e.g. "transfers:1" or "extrinsics:1"
        // Default start: "transfers:0" (Subscan uses 0-indexed page for API v2? Docs say "page" (int), usually 0 or 1 based. Subscan API v2 usually 0. Let's assume 0).
        // Wait, typical Subscan usage in docs: "row: 10, page: 0".

        const currentCursor = cursor || 'transfers:0';
        const [phase, pageStr] = currentCursor.split(':');
        const page = parseInt(pageStr, 10);
        const row = 50; // Batch size

        let events: OpenTxEvent[] = [];
        let nextCursor: string | null = null;

        if (phase === 'transfers') {
            const data = await fetchTransfers(address, page, row);
            const transfers = data.transfers || [];

            events = transfers.map(t => normalizeTransfer(t, address));

            // Determine next cursor
            if (transfers.length === row) {
                nextCursor = `transfers:${page + 1}`;
            } else {
                // Done with transfers, switch to extrinsics
                nextCursor = `extrinsics:0`;
            }
        } else if (phase === 'extrinsics') {
            const data = await fetchExtrinsics(address, page, row);
            const extrinsics = data.extrinsics || [];

            events = extrinsics.map(e => normalizeExtrinsic(e, address));

            if (extrinsics.length === row) {
                nextCursor = `extrinsics:${page + 1}`;
            } else {
                // Done with extrinsics, all done
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
