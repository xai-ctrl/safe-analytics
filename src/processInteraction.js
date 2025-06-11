const config = require("./config");
const EtherscanService = require("./services/etherscanService");
const ScraperService = require("./services/scraperService");
const ContractAnalyzer = require("./utils/contractAnalyzer");
const DataProcessor = require("./services/dataProcessor");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function processInteractions() {
  try {
    console.log("🔍 Starting protocol analysis...");

    const records = await DataProcessor.readCSV(config.inputFile);
    console.log(`📄 ${records.length} contracts found in CSV`);

    const contractsWithProtocols = [];

    for (const [index, record] of records.entries()) {
      const address = record.contract_address.toLowerCase();

      const [scrapedProtocol, apiLabel, isToken] = await Promise.all([
        ScraperService.scrapeContractProtocol(address),
        EtherscanService.getContractLabel(address),
        ContractAnalyzer.isTokenContract(address),
      ]);

      const protocol =
        scrapedProtocol !== "Unknown"
          ? scrapedProtocol
          : ContractAnalyzer.normalizeProtocolName(apiLabel);

      if (
        !ContractAnalyzer.isSafeOrInfra(apiLabel) &&
        !isToken &&
        protocol &&
        protocol !== "Unknown"
      ) {
        contractsWithProtocols.push({
          address,
          protocol,
          interactions: parseFloat(record.total_interactions),
          uniqueSafes: parseInt(record.unique_safe_users, 10),
        });
      }

      // Log every 10 contracts
      if ((index + 1) % 10 === 0 || index === records.length - 1) {
        console.log(`→ Processed ${index + 1} / ${records.length}`);
      }

      await delay(config.delayMs);
    }

    console.log(
      `✅ ${contractsWithProtocols.length} valid protocol contracts identified`
    );

    const protocolMap = DataProcessor.groupByProtocol(contractsWithProtocols);
    const topProtocols = DataProcessor.sortAndLimit(protocolMap, config.topN);

    DataProcessor.logResults(topProtocols);
    await DataProcessor.saveToCSV(topProtocols, config.outputFile);

    console.log("🏁 Analysis complete. Results saved to", config.outputFile);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

module.exports = { processInteractions };
