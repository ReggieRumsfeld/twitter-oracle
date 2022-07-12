require("dotenv").config();
const hre = require("hardhat");
const { network } = require("hardhat");

async function main() {
    const accounts = await hre.ethers.getSigners();
    //const metric = await hre.ethers.getContractAt("TwitterMetrics", process.env.ORACLE, accounts[0]);
    const apeShit = await hre.ethers.getContractAt("ApeShit", process.env.APESHIT, accounts[0]);
    /* const tx = await metric.request([
      //"1528474755153768448",
      //"1519771764582199297",
      //"1544666715962875906"
      //"1544874886941667328",
      //"1544764856762605568",
      //"1544758724652175360"
      "1545211967153078274",
    ]); */

    const tx = await apeShit.requestApeShit([
      "1544764856762605568",
        "1544758724652175360",
      "1545193510848135169"
    ]);
    const receipt = await network.provider.send("eth_getTransactionReceipt", [tx.hash]);
    console.log(receipt.logs[0].topics)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
