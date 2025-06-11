const axios = require("axios");
const cheerio = require("cheerio");

class ScraperService {
  static knownProtocols = [
    "aave",
    "uniswap",
    "curve",
    "cowswap",
    "maker",
    "compound",
    "balancer",
    "1inch",
    "lido",
    "sushi",
    "yearn",
    "dydx",
    "synthetix",
    "pancakeswap",
    "kyber",
    "bancor",
    "loopring",
    "0x",
    "rocketpool",
    "convex",
  ];

  static async scrapeContractProtocol(address) {
    try {
      const response = await axios.get(
        `https://etherscan.io/address/${address}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        }
      );
      
      const $ = cheerio.load(response.data);
      const summary = $("#ContentPlaceHolder1_contractCodeDiv")
        .text()
        .toLowerCase();
      const tags = $(".js-addr-tags a")
        .map((i, el) => $(el).text().toLowerCase())
        .get();
      const tokenTracker = $("#ContentPlaceHolder1_tr_tokeninfo a")
        .text()
        .toLowerCase();

      for (const proto of this.knownProtocols) {
        if (
          summary.includes(proto) ||
          tags.includes(proto) ||
          tokenTracker.includes(proto)
        ) {
          return proto.charAt(0).toUpperCase() + proto.slice(1);
        }
      }
      
      return "Unknown";
    } catch (error) {
      console.error(`Error scraping ${address}: ${error.message}`);
      return "Unknown";
    }
  }
}

module.exports = ScraperService;