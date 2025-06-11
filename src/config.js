require("dotenv").config();

const config = {
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  delayMs: 50,
  inputFile: "data/interactions.csv",
  outputFile: "data/top_protocols.csv",
  topN: 10,
};

module.exports = config;
