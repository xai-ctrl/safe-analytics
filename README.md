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

| Rank | Protocol | Interactions | Unique Safes | Contract Address                           |
| ---- | -------- | ------------ | ------------ | ------------------------------------------ |
| 1    | 0x       | 370          | 107          | 0x9d6a86facdcf24859a38e6b9a2ef87610a4fc157 |
| 2    | CowSwap  | 54           | 26           | 0x9008d19f58aabd9ed0d60971565aa8510560ab41 |
| 3    | Convex   | 19           | 5            | 0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b |
| 4    | Compound | 17           | 4            | 0xc0da02939e1441f497fd74f78ce7decb17b66529 |
| 5    | Curve    | 17           | 7            | 0xd533a949740bb3306d119cc777fa900ba034cd52 |
| 6    | Booster  | 8            | 3            | 0xf403c135812408bfbe8713b5a23a04b3d48aae31 |
| 7    | Aave     | 8            | 2            | 0x72e95b8931767c79ba4eee721354d6e99a61d004 |

- `top_tokens.csv` : ranked list of top tokens

### 🪙 Top Tokens Interacted With by Safe Wallets (June 2024)

| Rank | Token Name          | Interactions | Unique Safes | Contract Address                           |
| ---- | ------------------- | ------------ | ------------ | ------------------------------------------ |
| 1    | Tether USD          | 96           | 35           | 0xdac17f958d2ee523a2206206994597c13d831ec7 |
| 2    | HEX Token           | 36           | 1            | 0x2b591e99afe9f32eaa6214f7b7629768c40eeb39 |
| 3    | Dai Stablecoin      | 22           | 12           | 0x6b175474e89094c44da98b954eedeac495271d0f |
| 4    | Compound            | 22           | 6            | 0xc00e94cb662c3520282e6f5717214004a7f26888 |
| 5    | Lido                | 20           | 6            | 0x17144556fd3424edc8fc8a4c940b2d04936d17eb |
| 6    | Convex Token        | 19           | 5            | 0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b |
| 7    | Rocket Pool ETH     | 11           | 3            | 0xae78736cd615f374d3085123a210448e74fc6393 |
| 8    | Curve DAO Token     | 10           | 5            | 0xd533a949740bb3306d119cc777fa900ba034cd52 |
| 9    | Orion Token         | 9            | 2            | 0x0258f474786ddfd37abce6df6bbb1dd5dfc4434a |
| 10   | Aave Interest Token | 9            | 3            | 0x7effd7b47bfd17e52fb7559d3f924201b9dbff3d |

---

## 📉 Dune Query Setup

### ⏳ Timeline: June 2024

We analyze Safe wallet activity for the month of **June 2024**, using a refined Dune query that focuses on **internal contract calls** triggered from Safe transactions. This method ensures we include real protocol interactions — even when bundled via `MultiSend`, `execTransaction`, or other Safe modules.

```sql
-- Step 1: Combine all Safe executions into one table
WITH base_safe_calls AS (
  SELECT call_tx_hash AS tx_hash, call_tx_from AS safe_wallet, call_block_time
  FROM safe_ethereum.gnosissafe_call_exectransaction

  UNION ALL

  SELECT call_tx_hash, call_tx_from, call_block_time
  FROM safe_ethereum.gnosissafe_call_exectransactionfrommodule

  UNION ALL

  SELECT call_tx_hash, call_tx_from, call_block_time
  FROM safe_ethereum.gnosissafe_call_exectransactionfrommodulereturndata
),

-- Step 2: Filter by date range only once
filtered_safe_calls AS (
  SELECT tx_hash, safe_wallet
  FROM base_safe_calls
  WHERE call_block_time BETWEEN TIMESTAMP '2024-06-01' AND TIMESTAMP '2024-06-30'
),

-- Step 3: Get decoded contract calls (internal + direct)
decoded_contract_calls AS (
  SELECT DISTINCT td.tx_hash, td.to AS contract_address
  FROM ethereum.traces_decoded td
  JOIN filtered_safe_calls fsc ON td.tx_hash = fsc.tx_hash
  WHERE td.to IS NOT NULL
),

-- Step 4: Aggregate interactions
aggregated_interactions AS (
  SELECT
    dcc.contract_address,
    COUNT(*) AS total_interactions,
    COUNT(DISTINCT fsc.safe_wallet) AS unique_safe_users
  FROM decoded_contract_calls dcc
  JOIN filtered_safe_calls fsc ON dcc.tx_hash = fsc.tx_hash
  GROUP BY dcc.contract_address
)

-- Step 5: Return Top 100
SELECT *
FROM aggregated_interactions
ORDER BY total_interactions DESC
LIMIT 100;

```

### We considered using Dune’s native contract labels but faced blockers


- Coverage Gaps: Several protocol contracts used by Safe wallets (e.g. CowSwap routers, Morpho markets) had no labels or were mislabeled.

- Timeouts: Joining large decoded trace data with the labels table significantly increased query execution time and often hit Dune limits.
```sql
SELECT
  idc.contract_address,
  COALESCE(MAX(lc.name), 'Unknown') AS label,  -- Label join
  COUNT(*) AS total_interactions,
  COUNT(DISTINCT st.safe_wallet) AS unique_safe_users
FROM internal_decoded_calls idc
JOIN safe_txs st ON idc.tx_hash = st.tx_hash
LEFT JOIN labels.contracts lc ON lc.address = idc.contract_address
  AND lc.blockchain = 'ethereum'
GROUP BY idc.contract_address
ORDER BY total_interactions DESC
LIMIT 100;
```

- Dune Query ID: 5291974
- Fetcher script: `src/fetchInteractions.js`

> Due to rate limits and timeouts from Dune’s side, we use a capped LIMIT 100 approach. This keeps it stable under test constraints, but the query can be easily scaled up or optimized further when needed.

## 🧾 Purpose of the Interaction Table

The interaction table helps identify which smart contracts Safe wallets interact with the most. It acts as the foundation for understanding usage patterns across the ecosystem — which protocols are popular, how active they are, and how many unique Safes are involved.

Each row represents a contract, showing:

- `contract_address` : The destination of the call

- `total_interactions` : How many times any Safe interacted with it

- `unique_safe_users` : Number of distinct Safes that interacted with it

---
### 🔍 Theoretical Breakdown of the Query

#### 1. Identifying Safe Executions
- Combines all Safe-initiated calls from:
  - `execTransaction`
  - `execTransactionFromModule`
  - `execTransactionFromModuleReturnData`
- Captures `tx_hash`, `safe_wallet`, and `call_block_time`.
- Ensures coverage of both standard and module-based executions.

#### 2. Filtering by Date Range
- Filters transactions to those executed within **June 2024**.
- Applied once across all Safe calls after combining them.

#### 3. Tracing All Protocol Interactions
- Joins with `ethereum.traces_decoded` to extract **both**:
  - Direct contract calls (`trace_address = []`)
  - Internal/delegatecalls (`trace_address > 0`)
- Filters out:
  - Null `to` addresses
- Ensures full capture of all protocol interactions triggered by Safe wallets.

#### 4. Final Aggregation & Deduplication
- Deduplicates `(tx_hash, contract_address)` pairs to avoid overcounting.
- Aggregates:
  - `total_interactions` – number of distinct Safe transactions per contract
  - `unique_safe_users` – number of unique Safe wallets per contract
- Returns the **top 100 most interacted-with contracts**.

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

> **MultiSend & Nested Calls Decoding Limitations** — Safe wallets often batch multiple contract interactions using `MultiSend` or similar delegate calls. While Dune provides decoded traces for many calls, fully decoding nested internal calls from raw traces alongside decoded ones significantly increases query complexity and runtime, often leading to timeouts or performance issues. Due to these constraints, our query primarily uses decoded traces, capturing most interactions but potentially missing few internal batched calls. This limitation means some protocol interactions might be undercounted but reflects a practical trade-off given current tooling and data access.

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
