require("dotenv").config();
const fs = require("fs").promises;
const axios = require("axios");
const cheerio = require("cheerio");
const { parse } = require("csv-parse/sync");
const { createObjectCsvWriter } = require("csv-writer");

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const RATE_LIMIT_MS = 150;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const looksGeneric = (name = "") =>
  /proxy|handler|safe|gnosis|implementation|fallback|router|settlement|factory|forwarder|airdrop|manager|claim|create2/i.test(
    name.toLowerCase()
  );

async function isERC20(address) {
  try {
    const { data } = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    const abi = JSON.parse(data.result);
    const methods = abi.filter((f) => f.type === "function").map((f) => f.name);
    return ["decimals", "symbol", "name", "balanceOf", "totalSupply"].every(
      (fn) => methods.includes(fn)
    );
  } catch (err) {
    console.warn(`⚠️ ABI check failed for ${address}: ${err.message}`);
    return false;
  }
}

async function getContractMetadata(address) {
  try {
    const { data } = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`
    );
    const contract = data?.result?.[0] || {};
    const name = contract.ContractName?.trim() || "";
    const source = contract.SourceCode || "";
    const tags = [
      name,
      contract?.Implementation,
      contract?.Proxy,
      contract?.Library,
      source,
    ]
      .filter(Boolean)
      .flatMap((v) => v.split(/[\s:/,-]+/))
      .filter((tag) => tag.length <= 40)
      .map((tag) => tag.toLowerCase());

    return { name, tags };
  } catch (err) {
    console.warn(`⚠️ Metadata fetch failed for ${address}: ${err.message}`);
    return { name: "", tags: [] };
  }
}

async function scrapeTagsAndTokenName(address) {
  try {
    const { data } = await axios.get(
      `https://etherscan.io/address/${address}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );
    const $ = cheerio.load(data);

    const tags = $("#ContentPlaceHolder1_divLabels .hash-tag")
      .map((_, el) => $(el).text().trim().toLowerCase())
      .get();

    const tokenTracker = $("#ContentPlaceHolder1_tr_tokeninfo a").text().trim();
    const match = tokenTracker.match(/^(.+?)\s*\(/);
    const tokenName = match?.[1] || null;

    return {
      isToken:
        tags.includes("token contract") ||
        tags.includes("stablecoin") ||
        tokenTracker.length > 0,
      enrichedName: tokenName || tags[0] || "Unknown",
    };
  } catch (err) {
    console.warn(`⚠️ Scrape failed for ${address}: ${err.message}`);
    return { isToken: false, enrichedName: "Unknown" };
  }
}

async function fetchTokens() {
  const rawCsv = await fs.readFile("data/interactions.csv", "utf8");
  const rows = parse(rawCsv, { columns: true });

  const seen = new Set();
  const tokens = [];

  for (const row of rows) {
    const address = row.contract_address?.toLowerCase()?.trim();
    if (!address || seen.has(address)) continue;
    seen.add(address);

    const { name, tags } = await getContractMetadata(address);
    let finalName = name || row.protocol_name || "Unknown";

    const needsScrape =
      looksGeneric(finalName) || finalName === row.protocol_name;

    let isLikelyToken = false;
    if (needsScrape) {
      const { isToken, enrichedName } = await scrapeTagsAndTokenName(address);
      if (isToken) {
        isLikelyToken = true;
        finalName = enrichedName;
      }
    } else {
      isLikelyToken = tags.some((tag) =>
        /token|erc20|stablecoin|governance|usdc|usdt|dai/i.test(tag)
      );
    }

    if (isLikelyToken && !looksGeneric(finalName) && (await isERC20(address))) {
      tokens.push({
        ...row,
        protocol_name: finalName,
      });
    }

    await sleep(RATE_LIMIT_MS);
  }

  tokens.sort((a, b) => b.total_interactions - a.total_interactions);

  const csvWriter = createObjectCsvWriter({
    path: "data/top_tokens.csv",
    header: [
      { id: "contract_address", title: "contract_address" },
      { id: "total_interactions", title: "total_interactions" },
      { id: "unique_safe_users", title: "unique_safe_users" },
      { id: "protocol_name", title: "protocol_name" },
    ],
  });

  await csvWriter.writeRecords(tokens.slice(0, 10));
  console.log(
    `✅ Saved ${
      tokens.length > 10 ? 10 : tokens.length
    } tokens to top_tokens.csv`
  );
}

fetchTokens();
