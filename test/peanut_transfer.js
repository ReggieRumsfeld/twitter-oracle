const { assert, expect } = require("chai");
const hre = require("hardhat");
require("dotenv").config();

const iface = require("../libs/oracle_interface");

//const abiCoder = ethers.utils.defaultAbiCoder;

const { TweetArray } = require("../libs/TweetData");
const { network } = require("hardhat");

const AUTHOR_ID = "1373541111554318339";
//twitter.com/ReggieRumsfeld/status/1546338954177282048 // transfer id

describe("Transfer of balance via Tweet", function () {
    let accounts;
    let oracle;
    let apeShit;
    let provider;
    let address;

  before(async function () {
    const Beacon = await ethers.getContractFactory("Beacon");
    const beacon = await Beacon.deploy();
    await beacon.deployed();
    //
    const Oracle = await ethers.getContractFactory("TwitterMetrics");
    oracle = await Oracle.deploy();
    await oracle.deployed();
    //
    const hashTag = ethers.utils.solidityKeccak256(["string"], ["shitcoin"]);
    const requirements = [20, 20, 20, 80];
    const ApeShit = await ethers.getContractFactory("ApeShit");
    apeShit = await ApeShit.deploy(
      hashTag,
      requirements,
      beacon.address,
      oracle.address
    );
    await apeShit.deployed();
    accounts = await ethers.getSigners();
    provider = apeShit.provider;
  });
    
  it("Set Balance in storage of AUTHOR_ID/Transferor", async function () {
    // get address Wrapper
    const data = iface.encodeFunctionData("wrapId", [AUTHOR_ID]);
    const addressKey = await provider.call({
      to: apeShit.address,
      data: data,
    });
    const slot =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const location = ethers.utils.solidityKeccak256(
      ["uint256", "uint256"],
      [addressKey, slot]
    );
    await network.provider.send("hardhat_setStorageAt", [
      apeShit.address,
      location,
      "0x00000000000000000000000000000000000000000000000000000000000001A4",
    ]);
    address = (iface.decodeFunctionResult("wrapId", addressKey)[0]).toLowerCase();
    assert((await apeShit.peanuts(address)).eq(420), "Failed to set Balance");
  });

    it("Transfers Peanuts by means of Tweet", async function () {
      /*
    const transferHash = ethers.utils.solidityKeccak256(
        ["address", "address", "uint", "uint", "address"],
        [apeShit.address, address, 0, 1, accounts[7].address]
    );*/
    const tweetId = "1546338954177282048";
    const tx = await apeShit.tweetTransfer([tweetId], 1, accounts[7].address);
    const receipt = await provider.getTransactionReceipt(tx.hash);
    const eventData = iface.parseLog(receipt.logs[0]);
    const tweetArray = new TweetArray(eventData.args);
    await tweetArray.query();
    await accounts[0].sendTransaction({
      to: oracle.address,
      data: tweetArray.getExecData(),
    });
      assert((await apeShit.peanuts(accounts[7].address)).eq(1), "Not the expected Balance");
  });
});