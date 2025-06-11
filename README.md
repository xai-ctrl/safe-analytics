# 🧠 Safe Protocol Interaction Analysis

This project identifies the **Top 10 protocols Safe users interact with** on Ethereum mainnet using a blend of **on-chain data**, **API insights**, and **heuristics** to classify protocol interactions with high accuracy.

---

## 🚀 What It Does

- 📊 Pulls interaction data from **Dune Analytics**
- 🔍 Classifies contract addresses using:
  - Etherscan’s **source code labels**
  - On-chain **ABI analysis** for token detection
  - Scraping **Etherscan contract pages** for protocol clues
- 🧹 Filters out noise: Safe infra, proxies, tokens

---

## 📦 Usage

```bash
# 1. Add your credentials to a .env file
ETHERSCAN_API_KEY=your_key
DUNE_API_KEY=your_key

# 2. Install dependencies
npm install

# 3. (Optional) Fetch fresh interaction data from Dune
node src/fetchInteractions.js

# 4. Run the analysis
npm run start
```
---

## 📁 Output
- `top_protocols.csv` : Final ranked list of the top 10 protocols

- Console output: A neatly formatted summary table
---
## 📉 Dune Query Setup
We use a custom query on Dune that fetches the top contracts interacted with by Safe wallets:
```
SELECT 
  t.to AS contract_address,
  COUNT(*) AS total_interactions,
  COUNT(DISTINCT t."from") AS unique_safe_users
FROM ethereum.traces t
JOIN safe_ethereum.safes safes ON t."from" = safes.address
WHERE t.block_time >= CAST('2023-01-01' as TIMESTAMP)
  AND t.to IS NOT NULL
  AND t.call_type IN ('call', 'delegatecall')
  AND t.success = true
GROUP BY t."to"
ORDER BY total_interactions DESC
LIMIT 200
```
- Dune Query ID: 5255316
- Fetcher script: `src/fetchInteractions.js`

> Due to rate limits and timeouts from Dune’s side, we use a capped LIMIT 200 approach. This keeps it stable under test constraints, but the query can be easily scaled up or optimized further when needed.
---
## ⚠️ Challenges & Heuristics
- ⏱ Few Etherscan API rate limits (429s) — solved via a delay of 200ms between requests

- 🤷 Unlabeled contracts — mitigated by combining:

    - Source code contract name

    - ABI signature checks (to detect ERC-20 tokens)

    - Web scraping (cheerio) for tags and known protocol mentions

- 🧱 Proxy & Safe infra contracts — excluded using hardcoded keyword filters (proxy, gnosis, wallet, etc.)

## 💡 Future Improvements
- Cache labels to labels.json to avoid redundant lookups

- Deeper use of labels.contracts and safe_ethereum.safes from Dune

- Convert to a CLI tool or reproducible notebook for broader use

- Explore DeFi protocol registries or GitHub datasets for more reliable labeling
---
## 🛠 Built With
- Node.js

- Dune Client SDK

- Etherscan API for ABI + metadata

- Cheerio for contract page scraping

- csv-parse / csv-writer for input-output
---
## 📂 Folder Structure

```bash

├── index.js                 # Main entry point
├── src/
│   ├── fetchInteractions.js # Pulls data from Dune
│   ├── services/            # Scraper, analyzer, Etherscan utils
│   └── utils/               # Helpers for CSV, delays, etc.
├── interactions.csv         # Dune output (if fetched)
├── top_protocols.csv        # Final output
├── .env                     # API keys
└── README.md                # This file
```