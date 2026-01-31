# openTx

Open-source web app to fetch transaction history from blockchains and export it as CSV compatible with Awaken Tax.

**Live Demo:** [Vercel URL Here]

## Features

- **Chain Support:** Polkadot (more coming soon)
- **Export Formats:**
  - **Strict:** Compatible with Awaken Tax
  - **Enriched:** Awaken columns + extra metadata (Hash, Wallet, Explorer Links)
- **Privacy:** No wallet connection required. Just enter address.

## Supported Chains

| Chain    | Source  | Status |
|----------|---------|--------|
| Polkadot | Subscan | ✅ Live |
| Kusama   | Subscan | 🚧     |

## Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/duball/OpenTxs.git
   cd OpenTxs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your `SUBSCAN_API_KEY` (optional but recommended).

4. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## How to add a new chain

1. **Create Adapter:**
   - Add `adapters/[chain]/index.ts` (API Client)
   - Add `adapters/[chain]/normalize.ts` (Event Normalizer)
   
2. **Add API Route:**
   - Create `app/api/[chain]/txs/route.ts`
   
3. **Update UI:**
   - Add chain option in `app/page.tsx`

## License

MIT
