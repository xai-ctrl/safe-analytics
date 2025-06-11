const axios = require("axios");
const config = require("../config");

class EtherscanService {
  static async getContractABI(address) {
    try {
      const response = await axios.get(
        `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${config.etherscanApiKey}`
      );
      return response.data.status === "1"
        ? JSON.parse(response.data.result)
        : null;
    } catch (error) {
      console.error(`Error fetching ABI for ${address}: ${error.message}`);
      return null;
    }
  }

  static async getContractLabel(address) {
    try {
      const response = await axios.get(
        `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${config.etherscanApiKey}`
      );
      return response.data.result[0]?.ContractName || "Unknown";
    } catch (error) {
      console.error(`Error fetching label for ${address}: ${error.message}`);
      return "Unknown";
    }
  }
}

module.exports = EtherscanService;
