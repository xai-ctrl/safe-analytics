1. Input: interactions.csv
   └─ Columns: contract_address, total_interactions, unique_safe_users

2. For each contract address:
   ├─ Fetch metadata:
   │   ├─ Etherscan label (via getsourcecode)
   │   ├─ ABI (to check if it's a token)
   │   └─ Scrape Etherscan page for protocol hints (tags, token tracker)
   ├─ Skip if:
   │   ├─ It’s a token (ERC-20 interface detected)
   │   └─ It’s Safe infra (factory, proxy, module, etc.)
   └─ Assign to a known protocol using:
       └─ scrapedProtocol || normalizedLabel

3. Group contracts by protocol:
   └─ Aggregate:
      ├─ total_interactions
      ├─ unique_safe_users
      └─ List of contributing contract addresses

4. Output:
   ├─ top_protocols.csv
   └─ Console log of ranked table
