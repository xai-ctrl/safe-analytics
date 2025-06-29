const fs = require("fs").promises;
const { parse } = require("csv-parse/sync");
const { createObjectCsvWriter } = require("csv-writer");

class DataProcessor {
  static async readCSV(filename) {
    try {
      const csvData = await fs.readFile(filename, "utf-8");
      return parse(csvData, { columns: true, skip_empty_lines: true });
    } catch (error) {
      console.error(`Error reading CSV: ${error.message}`);
      throw error;
    }
  }

  static groupByProtocol(contractsWithProtocols) {
    const protocolMap = {};

    for (const {
      protocol,
      interactions,
      uniqueSafes,
      address,
    } of contractsWithProtocols) {
      if (!protocolMap[protocol]) {
        protocolMap[protocol] = {
          interactions: 0,
          uniqueSafes: 0,
          addresses: [],
        };
      }

      protocolMap[protocol].interactions += interactions;
      protocolMap[protocol].uniqueSafes += uniqueSafes;
      if (!protocolMap[protocol].addressMap) {
        protocolMap[protocol].addressMap = {};
      }
      protocolMap[protocol].addressMap[address] =
        (protocolMap[protocol].addressMap[address] || 0) + interactions;
    }

    return protocolMap;
  }

  static sortAndLimit(protocolMap, limit = 10) {
    const getTopAddress = (addressMap) => {
      return Object.entries(addressMap).sort((a, b) => b[1] - a[1])[0][0]; // most-used address
    };

    return Object.entries(protocolMap)
      .map(([protocol, data]) => ({
        protocol,
        interactions: data.interactions,
        uniqueSafes: data.uniqueSafes,
        address: getTopAddress(data.addressMap),
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, limit);
  }

  static logResults(protocols) {
    console.log(
      "Rank | Protocol | Interactions | Unique Safes | Contract Address"
    );
    console.log("-".repeat(70));

    protocols.forEach((protocol, index) => {
      console.log(
        `${index + 1} | ${
          protocol.protocol
        } | ${protocol.interactions.toLocaleString()} | ${protocol.uniqueSafes.toLocaleString()} | ${
          protocol.address
        }`
      );
    });
  }

  static async saveToCSV(protocols, filename) {
    const csvWriter = createObjectCsvWriter({
      path: filename,
      header: [
        { id: "rank", title: "Rank" },
        { id: "protocol", title: "Protocol" },
        { id: "interactions", title: "Interactions" },
        { id: "uniqueSafes", title: "Unique Safes" },
        { id: "address", title: "Contract Address" },
      ],
    });

    const csvRecords = protocols.map((p, i) => ({
      rank: i + 1,
      protocol: p.protocol,
      interactions: p.interactions,
      uniqueSafes: p.uniqueSafes,
      address: p.address,
    }));

    await csvWriter.writeRecords(csvRecords);
    console.log(`\nTop ${protocols.length} protocols saved to ${filename}`);
  }
}

module.exports = DataProcessor;
