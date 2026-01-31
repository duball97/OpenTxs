export type OpenTxEvent = {
  date: string; // "YYYY-MM-DD HH:mm:ss" UTC

  receivedQty?: string;
  receivedCurrency?: string;

  sentQty?: string;
  sentCurrency?: string;

  feeAmount?: string;
  feeCurrency?: string;

  notes?: string;

  // enrichment
  chain?: string;
  wallet?: string;
  txHash?: string;
  from?: string;
  to?: string;
  txType?: string;       // "transfer", "staking", "fee", "other"
  protocol?: string;     // "balances", "xcm", "staking", etc.
  blockHeight?: string;
  explorerUrl?: string;
};

export interface ChainAdapter {
  id: string;              // "polkadot"
  name: string;            // "Polkadot"
  symbol: string;          // "DOT"
  addressRegex: RegExp;    // wallet validation

  fetchAllEvents(params: {
    address: string;
    onProgress?: (p: { fetched: number; page?: number; done?: boolean }) => void;
    signal?: AbortSignal;
  }): Promise<OpenTxEvent[]>;
}
