# Twitter Oracle

A twitter oracle feeding tweet related metrics onto the chain, including the result of checking the tweets for a specific hashtag. Optionally, the oracle's backend screens the tweets for an execution command - keccak256(execution address, authorID, nonce, params) - and returns it with the callback. The execution hash is evaluated on chain, to allow for state changes (e.g. token transfers). 

The oracle backend is triggered by a Request event emitted by the oracle:

    event Request(address sender, uint[] ids, bytes32 hashTag, bytes params);

The event is invoked by calling:

    function request(uint[] calldata _ids, bytes32 _hashTag, bytes calldata _params) external override {
        emit Request(msg.sender, _ids, _hashTag, _params);
    }

The oracle offers two types of callBacks. The route taken depends on the arguments provided with the request.


## replyMetrics()

*Oracle calling **callBackMetrics()** on the requesting contract*

The callback takes an array of structured data as argument:

    struct TweetData {
        uint64 tweetID;
        uint64 authorID;
        uint64 conversationID;
        uint64 conversationAuthor;
        uint32 rtCount;
        uint32 replyCount;
        uint32 likeCount;
        uint32 qtCount;
        bool hashCheck;
    }

The ApeShit contract provides an example of how these metrics can be used for a tokenomics model:

A data request is made by calling `function requestMetrics(uint[] calldata _ids) external` with a range of tweet ids. The function body takes the hashtag to be included in the request from storage. The oracle's backend screens the tweet for the presence of the hashtag and returns the result as `bool hashCheck` 
 
`executeApeShit()` - invoked by the oracle calling into ApeShit - requires certain metric related conditions to be true; a certain amount of retweets, alongside either a min amount of likes or replies. The model also requires the tweet author to be different from the author of the conversation ID, since the main idea is to flag tweets and earn a token if doing so successfully (reaching a certain level of 3rd party interaction with the flagging tweet). 

The model is geared toward flagging degen token projects littering the ethereum ecosystem with the tag #apeshit. A successful flagger of apeshit receives a $PEANUT token, and the author of apeshit is branded for all eternity with a non transferable $APESHIT token 🙊:gun: 

The metrics provided are of a general nature, and many other **tweetandearn** models come to mind.


## replyCallData() 

*Oracle calling **callBackExecute()** on requesting contract*

The model uses a deterministic address (create2) involving the (prepended) twitter id as salt, hence **wrapping a valid ethereum address around the twitter id.** Currently it is represented as a dummy value in Beacon.sol, but the broader idea is to have a **standardized create2 procedure** which can be used by any DAPP for any platform (e.g. Discord and Telegram besides Twitter). The implementation logic to be used in the create2 process would be of a contract wallet nature. As part of an **incremental decentralization strategy**, the address can already be used to 'receive' tokens, such as access tokens, before any contract is deployed at the address.

Regardless of the ability to transfer, a standardized wrapper address also has "proof-of-identity" -ish qualities, since it potentially provides a record of one's (e.g. $peanut) and the other's (e.g $apeshit) social media activity. 

ApeShit's base contract, TweetExecution, allows for the transaction of $PEANUTS, by including a execution hash in a tweet, and passing a request to the oracle, with the params to be executed.

`function callBackExecute(TweetData calldata metrics, bytes32 execHash, bytes calldata params)` invoked by the oracle, takes in the execHash, and validates it on-chain by recalculating the hash on the basis of the authorID, the params and a nonce count for the authorID(from the contracts storage). If the validation passes, a transfer is executed from the authorID's balance (involving the params in the calldata).

One incremental decentralization strategy could be to allow such **oracle transfers** as long as no contract has been deployed at the create2 address wrapped around the authorID. 


## LUKSO Build 🆙#1

I'm primarily participating in the hackathon to take a deep dive into Universal Profiles, and actually build stuff based on them. Based on brief toe dipping, I see two paths of development we could take for the LUKSO Build UP. The two enhance each other, so if the team is big enough we could focus on both.

### Focus on a incremental decentralization strategy:

- Build the wallet implementation logic at the wrapper create2 address around a ERC725 Account System; 

- Taking the execution via tweet idea further, to have a way of transferring tokens without an account;

- Working on a standardized, cross platform (social media) procedure for the deterministic addresses; 
(much of this runs down to determining the logic, and a platform related prefix; with item 1 we have most of this covered as well)
 
 ### Focus on the oracle

 - Building a more trustless oracle thru the ability of verifying events on chain (LSP1);

 - Combined with a tokenomics "game" based on twitter metrics (along the lines of the ApeShit Contract or something completely diff.) 
