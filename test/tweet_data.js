const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

const iface = require("../libs/oracle_interface");

const abiCoder = ethers.utils.defaultAbiCoder;

const { TweetArray } = require("../libs/TweetData");

let tweetArray;
let accounts;

describe("Check TweetData field (given set of tweets)", function () {
  
  let oracle; 
  let provider;
  let receipt;
  let ids;
  let bytes32;
  let bytes;
  
  before(async function () {
    const Oracle = await ethers.getContractFactory("TwitterMetrics");
    oracle = await Oracle.deploy();
    await oracle.deployed();
    provider = oracle.provider;
    accounts = await ethers.getSigners();
  })

  xit("Perform request on Oracle(interface)", async function () {
    ids = ["1544758724652175360", "1544764856762605568", "1545193510848135169"];
    bytes32 = ethers.utils.solidityKeccak256(["string"], ["poops"]);
    bytes = abiCoder.encode(["bytes"], ["0xffffffffff"]);
    const data = iface.encodeFunctionData("request", [ids, bytes32, bytes]);
    const tx = await accounts[0].sendTransaction({
      to: oracle.address,
      data: data
    }
    )
     receipt = await provider.getTransactionReceipt(tx.hash);
     assert(receipt.status == 1, "Unsuccessful transaction");
  }) 

  it("Perform request on Oracle", async function () {
    const hashTag = ethers.utils.solidityKeccak256(["string"], ["poops"]);
    const tx = await oracle.request(
      ["1544758724652175360", "1544764856762605568", "1545193510848135169"],
      hashTag,
      abiCoder.encode(["bytes"], ["0xffffffffff"])
    );
    receipt = await provider.getTransactionReceipt(tx.hash);
    assert(receipt.status == 1, "Unsuccessful transaction");
  })

  it("Parse data into twitter API query", async function () {
    const eventData = iface.parseLog(receipt.logs[0]);
    tweetArray = new TweetArray(eventData.args);
    await tweetArray.query();
  });
});

describe("Check data against tweets", function () {
  /*
 {
    public_metrics: {
      retweet_count: 3122,
      reply_count: 624,
      like_count: 33076,
      quote_count: 177
    },
    conversation_id: '1544758724652175360',
    id: '1544758724652175360',
    text: 'Orwell was an optimist.',
    author_id: '5943622'  //@pmarca
  },

   {
    public_metrics: {
      retweet_count: 2857,
      reply_count: 2890,
      like_count: 44576,
      quote_count: 294
    },
    author_id: '44196397', //@elonmusk
    text: '@pmarca The world is actually vastly better than Orwell imagined, but there is also vastly more surveillance',
    id: '1544764856762605568',
    conversation_id: '1544758724652175360' 
  },
   {
    conversation_id: '1545193510848135169', // QUOTE TWEET (of '1544764856762605568')
    text: '6 minutes to midnight.. https://t.co/ZtlLSjNlzY',
    author_id: '1507498360462360580',
    public_metrics: { retweet_count: 0, reply_count: 0, like_count: 0, quote_count: 0 },
    id: '1545193510848135169'
  } */
  it("check TweetArray properties", async function () {
    assert(tweetArray.idArray.length == 3, "Not the expected length");
    assert(tweetArray.caller == accounts[0].address, "Not the expected Caller");
  })

  it("check Musk Tweet", async function () {
    const tweetData = tweetArray.tweets.get("1544764856762605568");
    assert(tweetData.authorID == "44196397", "Not the expected authorID");
    assert(tweetData.conversationAuthor == "5943622", "Not the expected Original author");
    assert(!tweetData.hashcheck, "Should be false");

  })

})
