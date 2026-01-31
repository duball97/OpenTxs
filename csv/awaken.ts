import { OpenTxEvent } from '../lib/types';
import { escapeCsv } from '../lib/csv';

export function generateCsv(events: OpenTxEvent[], mode: 'strict' | 'enriched'): string {
    const strictHeaders = [
        'Date',
        'Received Quantity',
        'Received Currency',
        'Sent Quantity',
        'Sent Currency',
        'Fee Amount',
        'Fee Currency',
        'Notes'
    ];

    const enrichedHeaders = [
        'Chain',
        'Wallet',
        'Tx Hash',
        'From',
        'To',
        'Tx Type',
        'Protocol',
        'Block Height',
        'Explorer URL'
    ];

    const headers = mode === 'strict'
        ? strictHeaders
        : [...strictHeaders, ...enrichedHeaders];

    const rows = [headers.map(escapeCsv).join(',')];

    for (const event of events) {
        const strictCols = [
            event.date,
            event.receivedQty,
            event.receivedCurrency,
            event.sentQty,
            event.sentCurrency,
            event.feeAmount,
            event.feeCurrency,
            event.notes
        ];

        const enrichedCols = [
            event.chain,
            event.wallet,
            event.txHash,
            event.from,
            event.to,
            event.txType,
            event.protocol,
            event.blockHeight,
            event.explorerUrl
        ];

        const cols = mode === 'strict'
            ? strictCols
            : [...strictCols, ...enrichedCols];

        rows.push(cols.map(escapeCsv).join(','));
    }

    return rows.join('\n');
}
