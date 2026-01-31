# Ox openTx

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-cyan)
![Status](https://img.shields.io/badge/Status-Beta-orange)

**The open-source bridge between your blockchain activity and tax reporting.**

[Live Demo](https://opentx.vercel.app) • [Report Bug](https://github.com/duball/OpenTxs/issues) • [Request Feature](https://github.com/duball/OpenTxs/issues)

</div>

---

## 🚀 Overview

**openTx** is the fastest way to export **Polkadot** transaction history for tax reporting. It connects directly to Subscan, fetches your complete DOT transaction history, and exports tax-ready CSVs compatible with leading crypto tax software.

### Key Features

*   **⚡️ Polkadot Native**: Built specifically for Polkadot (DOT) using Subscan's reliable indexer.
*   **🔒 Privacy First**: No wallet connection required—just paste your public address. Your keys never leave your possession.
*   **💰 Tax Ready**: One-click export to **Awaken Tax** compatible CSVs with proper date formatting and transaction categorization.
*   **📊 Dual Balance Display**: See both your on-chain balance and tax-relevant balance (transfer-derived).
*   **🔍 Clean Data**: Exports only meaningful transfers by default—no noise from system extrinsics or failed transactions.

---

## ⛓ Supported Chains

| Chain | Symbol | Indexer | Status |
| :--- | :--- | :--- | :--- |
| **Polkadot** | DOT | Subscan | ✅ Live |
| **Kusama** | KSM | Subscan | 🚧 Coming Soon |
| **Ethereum** | ETH | Etherscan | 📝 Planned |

---

## 🔌 Public API

OpenTx provides a free, public API for developers to fetch normalized transaction data.

### Endpoint
`GET /api/v1/export`

### Parameters
| Param | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `chain` | string | Yes | Only `polkadot` currently supported. |
| `address` | string | Yes | The wallet address to fetch. |
| `format` | string | No | `json` (default) or `csv`. |

### Examples

**Fetch JSON:**
```bash
curl "https://opentx.vercel.app/api/v1/export?chain=polkadot&address=15...&format=json"
```

**Download CSV:**
```bash
curl -o history.csv "https://opentx.vercel.app/api/v1/export?chain=polkadot&address=15...&format=csv"
```

---

## 🛠 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏁 Getting Started

### Prerequisites

*   Node.js 18+
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/duball/OpenTxs.git
    cd OpenTxs
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment** (Optional)
    To increase rate limits, add your Subscan API key:
    ```bash
    cp .env.example .env.local
    ```
    Add your key:
    ```env
    SUBSCAN_API_KEY=your_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ for the decentralized world.</p>
</div>
