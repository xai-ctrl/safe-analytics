require("dotenv").config();
const { DuneClient } = require("@duneanalytics/client-sdk");
const fs = require("fs").promises;

const client = new DuneClient(process.env.DUNE_API_KEY);
const InteractionsQueryID = 5291974;

async function fetchInteractions() {
  try {
    const csvResult = await client.runQueryCSV({
      queryId: InteractionsQueryID,
    });
    await fs.writeFile("data/interactions.csv", csvResult.data);
    console.log("Fetched and saved interactions.csv");
  } catch (error) {
    console.error("Dune fetch error:", error.message);
  }
}

fetchInteractions();
