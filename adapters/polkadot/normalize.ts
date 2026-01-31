import { OpenTxEvent } from '../../lib/types';
import { SubscanTransfer, SubscanExtrinsic } from './types';

const DOT_DECIMALS = 10;

function formatDot(plancks: string): string {
    if (!plancks || plancks === '0') return '0';
    if (plancks.includes('.')) return plancks; // Already formatted or decimal

    try {
        const val = BigInt(plancks);
        const divisor = BigInt(10 ** DOT_DECIMALS);
        const integer = val / divisor;
        const remainder = val % divisor;
        const remStr = remainder.toString().padStart(DOT_DECIMALS, '0').replace(/0+$/, ''); // Strip trailing zeros
        return remStr ? `${integer}.${remStr}` : `${integer}`;
    } catch {
        // Fallback for non-numeric/unexpected strings
        return plancks;
    }
}

function formatDate(timestamp: number): string {
    // Awaken Tax requires: MM/DD/YYYY HH:MM:SS (UTC)
    const d = new Date(timestamp * 1000);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

export function normalizeTransfer(t: SubscanTransfer, walletAddress: string): OpenTxEvent {
    const isReceived = t.to.toLowerCase() === walletAddress.toLowerCase();
    const isSent = t.from.toLowerCase() === walletAddress.toLowerCase();

    // Note: Handling self-transfer needed? 
    // If self, strictly it's both. Awaken usually treats as fee only or ignore.
    // We'll map as Sent for now if Sent, or Received if Received. 
    // If both, maybe Sent? 
    // Let's stick to simple logic:

    const formattedAmount = formatDot(t.amount);
    const formattedFee = formatDot(t.fee);

    const event: OpenTxEvent = {
        date: formatDate(t.block_timestamp),
        feeAmount: isSent ? formattedFee : '0', // Usually sender pays fee. 
        feeCurrency: 'DOT',
        notes: `Polkadot transfer`,

        // Enrichment
        chain: 'Polkadot',
        wallet: walletAddress,
        txHash: t.hash,
        from: t.from,
        to: t.to,
        txType: 'transfer',
        blockHeight: t.block_num.toString(),
        explorerUrl: `https://polkadot.subscan.io/extrinsic/${t.hash}`,
        protocol: t.module,
    };

    if (isReceived) {
        event.receivedQty = formattedAmount;
        event.receivedCurrency = 'DOT';
    }

    if (isSent) {
        event.sentQty = formattedAmount;
        event.sentCurrency = 'DOT';
    }

    // Handle Note for failed?
    if (!t.success) {
        event.notes = `FAILED Polkadot transfer`;
    }

    return event;
}

export function normalizeExtrinsic(e: SubscanExtrinsic, walletAddress: string): OpenTxEvent {
    const formattedFee = formatDot(e.fee);

    const event: OpenTxEvent = {
        date: formatDate(e.block_timestamp),
        // Extrinsics are usually actions by the wallet, so they fetch fee.
        feeAmount: formattedFee,
        feeCurrency: 'DOT',
        notes: `Extrinsic ${e.call_module}.${e.call_module_function}`,

        // Enrichment
        chain: 'Polkadot',
        wallet: walletAddress,
        txHash: e.extrinsic_hash,
        txType: e.call_module === 'balances' && e.call_module_function.includes('transfer') ? 'transfer' : 'fee', // Basic classification
        protocol: e.call_module,
        blockHeight: e.block_num.toString(),
        explorerUrl: `https://polkadot.subscan.io/extrinsic/${e.extrinsic_hash}`,
    };

    if (!e.success) {
        event.notes = `FAILED Extrinsic ${e.call_module}.${e.call_module_function}`;
    }

    return event;
}
