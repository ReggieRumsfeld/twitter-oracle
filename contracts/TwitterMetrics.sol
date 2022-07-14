//SPDX-License-Identifier: MIT License
pragma solidity ^0.8.0;

import "hardhat/console.sol";


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


interface iBeacon {
    function computeAddress(uint id) external returns (address);
}


interface iCallBack {
    function callBackMetrics(TweetData[] calldata metrics) external;
    function callBackExecute(TweetData calldata metrics, bytes32 execHash, bytes calldata params) external;
}


interface iTwitterMetrics {
    function request(uint[] calldata _ids, bytes32 _hashTag, bytes calldata _params) external;
}


// TODO: payable - GAS policy
//
/// TWITTER ORACLE emits a request event with the following args:
/// - an array of tweetIds, for which the backend will get metrics;
/// - a keccak256 hashed hashtag, for which the backend will screen the message, 
/// and return the result of the screening as bool;
/// - params to be used on the execution callBack(which also involves returning  
/// a recognized executionCommand).
///
/// The Oracle offers two types of callBacks:
/// A metrics only callback: replyMetrics();
/// The replyCallData() callback which, besides metrics, returns a execution hash
/// it found in the tweet at hand, as well as the params from the request event which
/// triggered the backend.

contract TwitterMetrics is iTwitterMetrics {
   
    event Request(address sender, uint[] ids, bytes32 hashTag, bytes params);
    
    address oracleSigner;

    constructor() {
        oracleSigner = msg.sender; 
    }

    /// Only accept callBacks from the oracle singer
    modifier onlySigner() {
        require(
            msg.sender == oracleSigner,
            "Only oracleSigner can execute this function"
        );
        _;
    }

    // Todo:
    // Require implementation of ICallBack interface
    // Require unique ids
    /**
    * Triggering the event which triggers the Oracle backend
    * @param _hashTag ethers.utils.solidityKeccak256(["string"], [<hashtag as lower case string, without #>])
    * @param _params params to be passed along with replyCallData() callBack
    */
    function request(uint[] calldata _ids, bytes32 _hashTag, bytes calldata _params) external override {
        // oracle backend is triggered by event
        emit Request(msg.sender, _ids, _hashTag, _params);
    }

    ////////////////////////
    // REPLY WITH METRICS //
    ////////////////////////

    // TODO: Restrain gas - Max gas - We don't know what logic lies on the _callee
    /**
    * @notice the METRICS ONLY callback
    * @dev oracleSigner could be rogue and triggerLogic multiple times.
    * Keeping it lean here:  TAKE SAFETY PRECAUTIONS ON CALLER (as part of STORAGE operations)
     */
    function replyMetrics (address callee, TweetData[] calldata metrics) external onlySigner {
        iCallBack _callee = iCallBack(callee);
        _callee.callBackMetrics(metrics);
    }

    ////////////////////////////////////////////////
    // REPLY WITH CALLDATA in addition to metrics //
    ////////////////////////////////////////////////

    /**
    * @notice the callback involving the execHash retrieved from the tweet, and the params involved in the Request event
     */
    function replyCallData (address callee, TweetData calldata metrics, bytes32 execHash, bytes memory params) external onlySigner {
        iCallBack _callee = iCallBack(callee);
        _callee.callBackExecute(metrics, execHash, params);
    }
}


/// Implementing logic based on the replyCallData() callBack from the oracle
// TODO: Make general purpose
abstract contract TweetExecution is iCallBack {

    mapping(address => uint) public peanuts;
    mapping(address => uint) public apeshit;
    mapping(address => uint) nonces; 

    address owner;

    iBeacon beacon;
    iTwitterMetrics twitterMetrics; 

    event Transfer(address indexed from, uint indexed amount, address indexed to);

    constructor(address _beaconAddress, address _metricAddress) {
        owner = msg.sender;
        beacon = iBeacon(_beaconAddress);
        twitterMetrics = iTwitterMetrics(_metricAddress);
    }

    //
    // LUKSO - upon incoming metrics incoming(); check for event emitted here??
    // Here we are either forced to put params in storage or make them part of feedback from oracle
    //
    // Balance check here for gasless?? 
    /**
    * @notice Triggering Request event on Oracle, with params (amount, recipient)
    */
    function tweetTransfer(uint[] calldata tweetId, uint amount, address recipient) external {
        require(tweetId.length == 1, "CallBackExecution can only be performed on ONE ID");
        twitterMetrics.request(tweetId, bytes32(0), abi.encode(amount, recipient));
    }

    /**
    * @notice the Oracle calling back in with execHash retrieved from tweet. Function recalculates
    * and verifies hash based on tweet metrics and storage variables.
    */
    function callBackExecute(TweetData calldata metrics, bytes32 execHash, bytes calldata params) external override {
        address from = wrapId(metrics.authorID); 
        (uint amount, address recipient) = abi.decode(params, (uint, address));
        uint _nonce = nonces[from];
        bytes32 reconHash = keccak256(abi.encodePacked(address(this), from, _nonce, amount, recipient));
        require(execHash == reconHash, "Invalid execution command"); 
        nonces[from]++;
        _transfer(from, amount, recipient);
    }

    // Just Peanuts - Apeshit sticks
    /**
    * @notice externally callable wrapper around _transfer for EOA balance holders 
    */
    function transfer(address from, uint amount, address to) external {
        require(msg.sender == from, "Not your funds");
    }

    function _transfer(address from, uint amount, address to) internal {
        uint fromBalance = peanuts[from];
        require(fromBalance >= amount, "Insufficient tokens held");
        // unchecked??
        peanuts[from] = fromBalance - amount;
        peanuts[to] += amount;
        emit Transfer(from, amount, to);
    }

    function mintNuts(uint amount, address recipient) internal {
        peanuts[recipient] += amount;
        emit Transfer(address(0), amount, recipient);
    }

    function mintShit(uint amount, address recipient) internal {
        apeshit[recipient] += amount;

    }

    // Visibility VIEW provokes compilation issues in hardhat
    /**
    * @notice Helper function returning create2 address based on authorID as salt
    */
    function wrapId(uint authorId) public returns (address) {
        return beacon.computeAddress(authorId);
    }
}


// TODO: revert unintended payments save for requests
// TODO: Make it generally usable (e.g. different hashtag campaigns) by implementing a
// containsHashTag => requirements mapping

// Nice to have VOTING RESULT OF PEANUT holders in modifiers / requirements in functions
// e.g. setting the hash to monitor
//
/// TOKENOMICS: Tweet author_id earning tokens based on tweet metrics/ Only 
contract ApeShit is TweetExecution {

    struct Requirements {
        uint16 retweet;
        uint16 quote;
        uint16 reply;
        uint16 like;
    }
    
    event TotalApeShit(uint[] tweets);

    mapping(uint => bool) processed; // IDs which have already been processed

    // hardcode it like rest of conditions, more gas efficient but less fun
    // We can develop decentralized admin around it (staked) Peanuts holders to vote 
    bytes32 public containsHashTag; // ethers.utils.solidityKeccak256(["string"], [<lower_case_string>])

    Requirements public requirements; // 8 bytes

    address public admin; 

    constructor(bytes32 _containsHashTag, Requirements memory _requirements, address _beaconAddress, address _metricAddress) TweetExecution(_beaconAddress, _metricAddress) {
        containsHashTag = _containsHashTag;
        //iTwitterMetrics twitterMetrics = iTwitterMetrics(_metricAddress);
        requirements = _requirements;
    }

    ///////////
    // ADMIN //
    ///////////

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perfom this function");
        _;
    }

    function setHashTag(bytes32 _hashTag) external onlyAdmin {
        containsHashTag = _hashTag;
    }

    function setRequirements(Requirements memory _requirements) external onlyAdmin {
        requirements = _requirements;
    }

    /// @dev kill-switch in case degens take over (failed social experiment)
    function withdrawEndorsement(address payable recipient) external onlyAdmin {
        selfdestruct(recipient);
    }

    /////////////
    // REQUEST //
    /////////////

    /// Triggering a REQUEST event on the ORACLE (involving the hashTag, which presence 
    // in the tweet is to be checked)
    function requestMetrics(uint[] calldata _ids) external {
        twitterMetrics.request(_ids, containsHashTag, bytes("0x00")); // emitting request event on TwitterMetrics
    }

    //////////////
    // RESPONSE //
    //////////////

    /// The ORACLE calling back in
    function callBackMetrics(TweetData[] calldata metrics) external override {
        executeApeShit(metrics);
    }
    
    // Data policy:
    // Oracle backend is neutral and provide the request data, without prechecks
    // However Oracle backend SHOULD arrange (e.g. authorID from low to high/ per author id conversationID from low to high)
    //
    // Apeshit UI should precheck data - to see if it can pass here (request can still be called directly here)
    // Here we should bail out if data can't meet requirements to avoid wasting gas on endless array of silly input.

    function executeApeShit(TweetData[] calldata metrics) internal {

        uint[] memory tweetIDS = new uint[](metrics.length);
        
        Requirements memory _req = requirements; // since we'll make it universal and get requirements from map
        uint shitCaller = 0;
        uint count = 0;
        for(uint i = 0; i < metrics.length; i++) {
            require(metrics[i].hashCheck, "Tweet doesn't include the relevant #"); 
            require(metrics[i].authorID != metrics[i].conversationAuthor, "Can't call apeshit on yourself");
            require(!processed[metrics[i].tweetID], "CallData includes at least one tweet which has already been processed");
            require(
                metrics[i].rtCount >= _req.retweet && (metrics[i].likeCount >= _req.like || metrics[i].replyCount >= _req.reply),
                "Not meeting threshold"
            ); 
            require(shitCaller == 0 || metrics[i].authorID >= shitCaller, "Data out of order, literally");
            processed[metrics[i].tweetID] = true;
            tweetIDS[i] = metrics[i].tweetID;
            if(shitCaller != 0 && metrics[i].authorID != shitCaller) { // taking care of previous shitcaller
                uint amount = count;
                count = 0;
                mintNuts(amount, wrapId(shitCaller));
            }
            count++;
            if (i == metrics.length -1) mintNuts(count, wrapId(metrics[i].authorID)); // current shitcaller if last
            shitCaller = metrics[i].authorID;
        }
        // batch action
        emit TotalApeShit(tweetIDS);
        
    }
}