const hre = require("hardhat");

async function main() {
    // ORACLE
  const Metrics = await hre.ethers.getContractFactory("TwitterMetrics");
  const metrics = await Metrics.deploy();
  await metrics.deployed();
    console.log("TwitterMetrics ORACLE deployed to:", metrics.address);
    // BEACON (dummy)
    const Beacon = await hre.ethers.getContractFactory("Beacon");
    const beacon = await Beacon.deploy()
    await beacon.deployed();
    console.log("Beacon: ", beacon.address);
    // APESHIT
    const hashTag = hre.ethers.utils.solidityKeccak256(["string"], ["apeshit"]);
    const Apeshit = await hre.ethers.getContractFactory("ApeShit");
    const apeshit = await Apeshit.deploy(
      hashTag,
      //requirements,
        [20, 20, 20, 20],
      beacon.address,
      metrics.address
    );
    await apeshit.deployed();
    console.log("APESHIT: ", apeshit.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
