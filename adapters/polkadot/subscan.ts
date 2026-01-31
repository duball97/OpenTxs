import { SubscanResponse, SubscanTransfersData, SubscanExtrinsicsData, SubscanAccountData } from './types';

// Removed global BASE_URL to support dynamic networks

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
    // Simple throttle: wait 250ms before every request.
    // This ensures that even in a tight loop, we max out at 4 req/s (safely below 5 req/s limit).
    await sleep(250);

    try {
        const res = await fetch(url, options);

        // Handle Rate Limit (429)
        if (res.status === 429 && retries > 0) {
            console.warn('Rate limited by Subscan (429). Retrying in 2s...');
            await sleep(2000); // Wait longer for 429
            return fetchWithRetry(url, options, retries - 1);
        }

        // Handle Server Errors (5xx)
        if (res.status >= 500 && retries > 0) {
            console.warn(`Subscan server error (${res.status}). Retrying in 1s...`);
            await sleep(1000);
            return fetchWithRetry(url, options, retries - 1);
        }

        return res;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Network error fetching Subscan. Retrying in 1s...`);
            await sleep(1000);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function fetchTransfers(address: string, page: number, subscanHost: string, row: number = 100): Promise<SubscanTransfersData> {
    const apiKey = process.env.SUBSCAN_API_KEY;
    const response = await fetchWithRetry(`https://${subscanHost}/api/v2/scan/transfers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
            address,
            page,
            row,
        }),
    });

    if (!response.ok) {
        throw new Error(`Subscan API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as SubscanResponse<SubscanTransfersData>;

    if (result.code !== 0) {
        throw new Error(`Subscan error ${result.code}: ${result.message}`);
    }

    return result.data || { count: 0, transfers: [] };
}

export async function fetchExtrinsics(address: string, page: number, subscanHost: string, row: number = 100): Promise<SubscanExtrinsicsData> {
    const apiKey = process.env.SUBSCAN_API_KEY;
    const response = await fetchWithRetry(`https://${subscanHost}/api/v2/scan/extrinsics`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
            address,
            page,
            row,
        }),
    });

    if (!response.ok) {
        throw new Error(`Subscan API error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as SubscanResponse<SubscanExtrinsicsData>;

    if (result.code !== 0) {
        throw new Error(`Subscan error ${result.code}: ${result.message}`);
    }

    return result.data || { count: 0, extrinsics: [] };
}
export async function fetchAccount(address: string, subscanHost: string): Promise<SubscanAccountData | null> {
    const apiKey = process.env.SUBSCAN_API_KEY;

    try {
        const response = await fetchWithRetry(`https://${subscanHost}/api/scan/account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'X-API-Key': apiKey } : {}),
            },
            body: JSON.stringify({ key: address }),
        });

        if (!response.ok) {
            console.warn(`Subscan account API unavailable (${response.status}). Balance display disabled.`);
            return null;
        }

        const result = (await response.json()) as SubscanResponse<SubscanAccountData>;

        if (result.code !== 0 || !result.data) {
            console.warn(`Subscan account API returned no data. Balance display disabled.`);
            return null;
        }

        return result.data;
    } catch (error) {
        console.warn('Subscan account fetch failed:', error);
        return null;
    }
}
