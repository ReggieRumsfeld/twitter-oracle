const axios = require("axios").default;
const utils = require("ethers").utils;

const iface = require("./oracle_interface");

// Require unique ids on request call
// tweetMap of maps to be able to have an order (lo to hi in calldata)
// TODO: only trigger getExecData() (and the subsequent replyCallBack()) when params are provided;
class TweetArray {
  /** @param {*} logArguments output from iface.parseLog(log).args) */
  constructor(logArguments) {
      this.idArray = logArguments.ids; // to check on incoming results?
      this.caller = logArguments.sender;
      this.hashToCheck = logArguments.hashTag;
      this.execParams = logArguments.params;
      this.tweets = new Map()
  }

    // A-lot-a-looping or indvidual queries for ogAuthor (and await them) ??? - GET OG_Author from first Twitter Query??
    // Todo: Constrain the amount of ids in query
  async query() {
        let idStrings = [];
         for (let i = 0; i < this.idArray.length; i++) {
           idStrings.push(this.idArray[i].toString());
         }
      const reply = (await this.requestData(idStrings)).data.data;
        let queryOG = new Map() // conversation.id => tweetData 
           for (let i = 0; i < reply.length; i++) {
             // Status Check 200
               const tweetData = new TweetData(reply[i]);
               // check original / set originalAuthor or get it via second query
               if (tweetData.tweetID == tweetData.conversationID) tweetData.setConversationAuthor(tweetData.authorID);
               else {
                   const _array = queryOG.get(tweetData.conversationID);
                   if (!_array) queryOG.set(tweetData.conversationID, [tweetData.tweetID]);
                   else {
                       _array.push(tweetData.tweetID);
                       queryOG.set(tweetData.conversationID, _array);
                   }
               }
               // check hash
               tweetData.checkHash(this.hashToCheck);
               // get execution hash
             tweetData.checkExec();
                this.tweets.set(tweetData.tweetID, tweetData); // previously
           }
        if (queryOG.size > 0) { // under the hood?? Flattening already? Create key arrays immediately and check for length
            const data = (await this.requestData(Array.from(queryOG.keys()))).data.data; // request strings based on the mapped conversation.ids
            data.forEach(element => {
                if (element.id != element.conversation_id)
                       throw new Error(
                         "This should be top level hence id == conversation.id"
                       );
                const ids = queryOG.get(element.id); 
                ids.forEach(entry => { // tweet IDs of non-top level tweets
                    // Get TweetData from map
                    const tweetData = this.tweets.get(entry);
                    if (!tweetData.conversationAuthor) {
                        tweetData.setConversationAuthor(element.author_id);
                    }
                    else throw new Error("Should not have been set for the tweet at hand")
                }); 
            });     
        }
    }    
    
    getCallData() {
        const data = [];
        let _authorID;
        let _conversationAuthor;
      for (const items of (this.tweets.entries())) {
        const authorID = ethers.BigNumber.from(items[1].authorID);
        const conversationAuthor = ethers.BigNumber.from(items[1].conversationAuthor)
          // Correct order authorID lo to hi;
       // if (!_authorID || items[1].authorID > _authorID || (items[1].authorID == _authorID && items[1].conversationAuthor > _conversationAuthor)) {
        if(!_authorID || authorID.gt(_authorID) || (authorID.eq(_authorID) && conversationAuthor.gt(_conversationAuthor))) {
          console.log("PUSH: ", items[1].authorID)
                data.push(items[1].returnTuple());
        } else {
              console.log("UNSHIFT: ", items[1].authorID);
                data.unshift(items[1].returnTuple());
            }
        _authorID = items[1].authorID;
        _conversationAuthor = items[1].conversationAuthor;
            //data.push(items[1].returnTuple());
        }
      if(this.tweets.size != data.length) throw new Error("Something wrong with shuffle")
      const callData = iface.encodeFunctionData("replyMetrics", [
        this.caller,
        data,
      ]);
      //console.log(callData);
      return callData;    
    }
  
  getExecData() {
    const tweetId = (this.tweets.keys()).next().value; //key
    const tweet = this.tweets.get(tweetId); //tweetData from ID
    const callData = iface.encodeFunctionData("replyCallData", [
      this.caller,
      tweet.returnTuple(),
      tweet.execHash,
      this.execParams
    ])
   // console.log(callData);
    return callData
    }

    async requestData(tweetIDs) {
    return await axios.get(
      //`https://api.twitter.com/2/tweets?ids=${tweets}&tweet.fields=public_metrics,author_id,conversation_id&expansions=attachments.media_keys&media.fields=public_metrics`,
      `https://api.twitter.com/2/tweets?ids=${tweetIDs}&tweet.fields=public_metrics,author_id,conversation_id`,
      {
        headers: {
          Authorization: `bearer ${process.env.BEARER_TOKEN}`,
        },
      }
    );
    }
}

class TweetData {
  constructor(element) {
    this.tweetID = element.id;
    this.authorID = element.author_id;
    this.conversationID = element.conversation_id;
    this.rtCount = element.public_metrics.retweet_count;
    this.replyCount = element.public_metrics.reply_count;
    this.likeCount = element.public_metrics.like_count;
      this.qtCount = element.public_metrics.quote_count;
      this.text = element.text;
      this.hashCheck = false;
  }
  setConversationAuthor(author) {
    this.conversationAuthor = author;
  }
  checkHash(tagHash) {
    // rename
    const text = this.text;
    //const hashToCheck = "0xd9111c4508775a0647cf07e3784b1365c4d87a95d229b53532779753b5b0f426"; //!!!!!!!!!!
    const hashToCheck = tagHash;
   // console.log(hashToCheck)
    //
    const bump = !text.startsWith("#");
    const slices = text.split("#"); // IT doesn't include the hashtag - Precheck if it includes at all??
    if (slices.length == 1 && bump) return;
    let i = bump ? 1 : 0;
    for (i; i < slices.length; i++) {
     // console.log(slices[i]);
      // find index of " "
      const index = slices[i].indexOf(" "); // index of whiteSpace;
      const sub = slices[i].slice(0, index).toLowerCase(); // lower case conversion
      //console.log(sub);
      const hash = utils.solidityKeccak256(["string"], [sub]);
      //console.log("Hash: ", hash);
      if (hash == hashToCheck) {
        //console.log("SuccesFull check");
        this.hashCheck = true;
      }
    }
  }

  checkExec() {
    const hashIndex = this.text.indexOf("0x");
    const tillEnd = this.text.slice(hashIndex);
    //console.log("Till End: ", tillEnd);
    const index = tillEnd.indexOf(" ");
     //console.log("Index whitespace: ", index);
    // check with diff Hashes 
    if (index > 0) {
      const hashString = tillEnd.slice(0, index + 1);
      console.log("HashSTring: ", hashString);
      this.execHash = hashString;
    } else this.execHash = tillEnd;
    }    
  returnTuple() {
/*
    return abiCoder.encode(
      ["tuple(uint64,uint64,uint64,uint64,uint32,uint32,uint32,uint32,bool)"],
      [
        [
          this.tweetID,
          this.authorID,
          this.conversationID,
          this.conversationAuthor,
          this.rtCount,
          this.replyCount,
          this.likeCount,
          this.qtCount,
          this.hashCheck
        ]
      ]
    );
*/
    return [
      this.tweetID,
      this.authorID,
      this.conversationID,
      this.conversationAuthor,
      this.rtCount,
      this.replyCount,
      this.likeCount,
      this.qtCount,
      this.hashCheck,
    ];

  }
}

module.exports = {TweetArray}


