// Heroku issue?
require("dotenv").config();
const ethers = require("ethers");
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
const { TweetArray } = require("./libs/TweetData")
const key = process.env.SIGNER_KEY;
const signer = new ethers.Wallet(key, provider);

const iface = require("./libs/oracle_interface");

// Request event filter
const filter = {
  address: process.env.ORACLE,
  fromBlock: "latest",
  topics: [
    iface.getEventTopic("Request"),
  ],
};

provider.on(filter, async (log, event) => {
    //console.log("Log: ", log);
    const args = iface.parseLog(log).args;
    //console.log("Args: ", args);
    const tweetArray = new TweetArray(args);
    await tweetArray.query();
    //console.log(tweetArray.tweets)
    //console.log(tweetArray.tweets.keys());
    const callData = tweetArray.getCallData();
    const tx = await signer.sendTransaction({
        to: process.env.ORACLE,
        data: callData
    })
    
});

