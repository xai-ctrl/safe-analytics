const EtherscanService = require("../services/etherscanService");

class ContractAnalyzer {
  static async isTokenContract(address) {
    const abi = await EtherscanService.getContractABI(address);
    if (!abi) return false;

    const tokenMethods = ["totalSupply", "decimals", "balanceOf", "transfer"];
    return tokenMethods.some((method) =>
      abi.some((item) => item.name === method && item.type === "function")
    );
  }

  static normalizeProtocolName(label) {
    if (!label || label === "Unknown") return null;

    let normalized = label
      .replace(/(V\d+|Version\d+)/i, "")
      .replace(
        /(Protocol|Token|Exchange|Pool|Router|Settlement|Logger|Lib|Wrapper|Bundler|Sell)$/i,
        ""
      )
      .trim();

    if (normalized.match(/GP|ComposableCoW/i)) return "CowSwap";
    if (normalized.match(/Aggregation/i)) return "1inch";
    if (normalized.match(/Universal/i)) return "Uniswap";
    if (normalized.match(/Dfs/i)) return null; // Exclude DefiSaver utilities

    return normalized;
  }

  static isSafeOrInfra(label) {
    const safeInfraKeywords = [
      "safe",
      "gnosis",
      "multisig",
      "proxy",
      "factory",
      "wallet",
      "module",
      "guard",
      "handler",
      "multisend",
      "fallback",
      "airdrop",
      "signer",
      "executor",
      "logger",
      "lib",
      "controller",
      "bundler",
      "wrapper",
      "dfs",
      "governor",
    ];

    return safeInfraKeywords.some((keyword) =>
      label.toLowerCase().includes(keyword)
    );
  }
}

module.exports = ContractAnalyzer;
