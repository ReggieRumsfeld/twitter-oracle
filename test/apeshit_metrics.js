const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

const iface = require("../libs/oracle_interface");

const { TweetArray } = require("../libs/TweetData");

//https://twitter.com/Lifeist66512915/status/1544747763543441408 
//https://twitter.com/citrusramaphosa/status/1544427214451638272

async function getAddress(authorID, contract, provider) {
    const data = iface.encodeFunctionData("wrapId", [authorID]);
    const result = await provider.call({
        to: contract,
        data: data
    })
    const address = (iface.decodeFunctionResult("wrapId", result))[0];
    return address;
}

const tweets = ["1544427214451638272", "1544747763543441408"];
describe("Metrics based token distribution", async function () {
    let apeShit;
    let oracle;
    let requirements;
    let tweetArray;
    let hashTag;
    let tweet;
    let tweet1;
    let tweet2;
    let accounts;
    let provider;

    before(async function () {
        const Beacon = await ethers.getContractFactory("Beacon");
        const beacon = await Beacon.deploy();
        await beacon.deployed();
        //
        const Oracle = await ethers.getContractFactory("TwitterMetrics");
        oracle = await Oracle.deploy();
        await oracle.deployed();
        //
        hashTag = ethers.utils.solidityKeccak256(["string"], ["shitcoin"]);
        // retweet, quote, reply, like
        requirements = [20, 20, 20, 80];
        const ApeShit = await ethers.getContractFactory("ApeShit");
        apeShit = await ApeShit.deploy(hashTag, requirements, beacon.address, oracle.address);
        await apeShit.deployed();
        accounts = await ethers.getSigners();
        provider = apeShit.provider;
    })

    it("Check structured data", async function () {
        const req = await apeShit.requirements();
        const slice = req.slice(0, 4);
        slice.forEach((element, index) => {
            assert.equal(element,requirements[index], "Requirements parse error");
        })        
    })

    it("Request Metrics and parse Log", async function () {
        const tx = await apeShit.requestMetrics(tweets);
        const receipt = await provider.getTransactionReceipt(tx.hash);
        const eventData = iface.parseLog(receipt.logs[0]);
        tweetArray = new TweetArray(eventData.args);
        assert(tweetArray.hashToCheck == hashTag, "Not the expected hashTag to check");
        await tweetArray.query();
        tweet = tweetArray.tweets.get(tweets[0]);
        assert(tweet.hashCheck, "hashCheck should be TRUE");
        tweet1 = tweetArray.tweets.get(tweets[1]);
        assert(tweet1.hashCheck, "hashCheck should be TRUE");
    })

    it("Callback via Oracle", async function () {
        const data = tweetArray.getCallData();
        const tx = await accounts[0].sendTransaction({
            to: oracle.address,
            data: data
        })
        const receipt = await provider.getTransactionReceipt(tx.hash)
        console.log("Logs: ", receipt.logs)

        assert(receipt.status == 1);
    })
    
    it("assert expected state changes", async function () {
        const address = await getAddress(tweet.authorID, apeShit.address, provider);
        const balance = await apeShit.peanuts(address);
        console.log("Balance: ", balance)

        const address1 = await getAddress(tweet1.authorID, apeShit.address, provider);
        const balance1 = await apeShit.peanuts(address1);
         console.log("Balance: ", balance1);
       // assert(balance.eq(1))
    })
})