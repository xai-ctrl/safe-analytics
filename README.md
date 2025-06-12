# 🧠 Safe Protocol Interaction Analysis

This project identifies the **Top 10 protocols Safe users interact with** on Ethereum mainnet using a blend of **on-chain data**, **API insights**, and **heuristics** to classify protocol interactions with high accuracy.


## 🚀 What It Does

- 📊 Pulls interaction data from **Dune Analytics**
- 🔍 Classifies contract addresses using:
  - Etherscan’s **source code labels**
  - On-chain **ABI analysis** for token detection
  - Scraping **Etherscan contract pages** for protocol clues
- 🧹 Filters out noise: Safe infra, proxies, tokens



## 📦 Usage

```bash
# 1. Add your credentials to a .env file
ETHERSCAN_API_KEY=your_key
DUNE_API_KEY=your_key

# 2. Install dependencies
npm install

# 3. (Optional) Fetch fresh interaction data from Dune
npm run fetch:safes

# 4. Run the analysis
npm run start

# Top Tokens 
npm run fetch:tokens

```
---

## 📁 Output
- `top_protocols.csv` : Final ranked list of the top protocols

- `console output` : A neatly formatted summary table

| Rank | Protocol    | Interactions | Unique Safes | Contract Addresses   |
| ---- | ----------- | ------------ | ------------ | -------------------- |
| 1    | CowSwap     | 80,337       | 9,841        | 0x9008..., 0xfdaf... |
| 2    | Aave        | 8,138        | 1,617        | 0x91b3..., 0x7079... |
| 3    | 1inch       | 7,910        | 2,082        | 0x1111...            |
| 4    | Uniswap     | 7,455        | 2,096        | 0x3fc9...            |
| 5    | LiFiDiamond | 4,460        | 1,412        | 0x1231...            |
| 6    | Morpho      | 4,392        | 349          | 0xbbbb...            |
| 7    | Pendle      | 4,235        | 588          | 0x8888...            |
| 8    | LooksRare   | 4,192        | 8            | 0x0000...            |


- `top_tokens.csv` : ranked list of top tokens

| Rank | Token Name            | Interactions | Unique Safes  | Contract Address                             |
|------|-----------------------|--------------|---------------|----------------------------------------------|
| 1    | TetherToken           | 310,855      | 14,197        | 0xdac17f958d2ee523a2206206994597c13d831ec7   |
| 2    | EtherFiGovernanceToken| 40,937       | 346           | 0xfe0c30065b384f05761f15d0cc899d4f9f9cc0eb   |
| 3    | Dai                   | 34,056       | 4,208         | 0x6b175474e89094c44da98b954eedeac495271d0f   |
| 4    | USDe                  | 33,662       | 511           | 0x4c9edd5852cd905f086c759e8383e09bff1e68b3   |
| 5    | LinkToken             | 29,307       | 1,167         | 0x514910771af9ca656af840dff83e8264ecf986ca   |
| 6    | RX                    | 24,853       | 12            | 0x5b1e769e74fd7e532a48261ab42ee906f0090556   |
| 7    | WBTC                  | 13,926       | 2,143         | 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599   |
| 8    | FetchToken            | 13,299       | 127           | 0xaea46a60368a7bd060eec7df8cba43b7ef41ad85   |
| 9    | AIAnalysisToken       | 13,147       | 4             | 0x0501b9188436e35bb10f35998c40adc079003866   |
| 10   | WrappedNCG            | 12,669       | 21            | 0xf203ca1769ca8e9e8fe1da9d147db68b6c919817   |

---
## 📉 Dune Query Setup

### Timeline
 > We use a custom query on Dune that fetches the top contracts interacted with by Safe wallets starting from January 1, 2023:

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

## 🧾 Purpose of the Interaction Table
The interaction table helps identify which smart contracts Safe wallets interact with the most. It acts as the foundation for understanding usage patterns across the ecosystem — which protocols are popular, how active they are, and how many unique Safes are involved.

Each row represents a contract, showing:

- `contract_address` : The destination of the call

- `total_interactions` : How many times any Safe interacted with it

- `unique_safe_users` : Number of distinct Safes that interacted with it

---
## 🧭 Approach (Simplified)

1. **Input**  
   - Read from `interactions.csv`  
   - Columns: `contract_address`, `total_interactions`, `unique_safe_users`

2. **Labeling**  
   - For each address:
     - Get Etherscan label via API
     - Check ABI to detect tokens
     - Scrape Etherscan page for protocol hints  
   - Skip if:
     - It’s an ERC-20 token  
     - It’s Safe infra (proxy, factory, etc.)  
   - Assign protocol name using scraped data or normalized label

3. **Grouping**  
   - Group addresses by protocol  
   - Sum `interactions` and `unique_safe_users`  
   - Collect contributing contract addresses

4. **Output**  
   - Save results to `top_protocols.csv`  
   - Print a ranked summary table in the console

---
## 🪙 Token Identification

**🧠 What it does**  
Detects ERC-20 tokens from `interactions.csv` by analyzing contract metadata, scraping Etherscan for labels, and verifying standard token functions. Outputs the top 10 tokens by interaction count.

 > Approach

1. **Load** `interactions.csv` (contract address, interactions, Safe users).
2. **For each address**:
   - Fetch Etherscan metadata (name, tags).
   - Scrape Etherscan if the name looks generic.
   - Check for ERC-20 functions via ABI (`symbol`, `decimals`, etc.).
3. **Filter** valid tokens:
   - Should look like a token (via metadata or scrape).
   - Should not have a generic name (e.g., Proxy, Factory).
   - Must implement standard ERC-20 methods.
4. **Write** the top 10 tokens to `top_tokens.csv`, sorted by interaction count.


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

├── src/
│   ├── index.js             # Main entry point
│   ├── services/            # Scraper, analyzer, Etherscan utils
│   └── utils/               # Helpers for CSV, delays, etc.
├── data/
│   ├── interactions.csv     # Dune output (if fetched)
│   ├── top_protocols.csv    # Final output
├── scripts/
│   ├── fetchInteractions.js # Pulls data from Dune
│   ├── fetchTokens.js      # Get Top tokens
├── .env                     # API keys
└── README.md                # This file
```
