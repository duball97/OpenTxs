export interface SubscanResponse<T> {
    code: number;
    message: string;
    data: T | null;
}

export interface SubscanTransfer {
    from: string;
    to: string;
    amount: string; // plancks
    extrinsic_index: string; // "14490804-2"
    success: boolean;
    hash: string;
    block_num: number;
    block_timestamp: number;
    module: string;
    event_id: string; // "Transfer"
    fee: string;
    asset_symbol: string; // "DOT"
}

export interface SubscanExtrinsic {
    extrinsic_index: string; // "14490804-2"
    call_module: string;
    call_module_function: string;
    fee: string;
    success: boolean;
    block_timestamp: number;
    extrinsic_hash: string;
    block_num: number;
    params: string; // JSON string of params
}

export interface SubscanTransfersData {
    count: number;
    transfers: SubscanTransfer[] | null;
}

export interface SubscanExtrinsicsData {
    count: number;
    extrinsics: SubscanExtrinsic[] | null;
}
