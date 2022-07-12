const Interface = require("ethers").utils.Interface;

module.exports = new Interface([
  "event Request(address sender, uint[] ids, bytes32 hashTag, bytes params)",
  "function request(uint[],bytes32,bytes)",
  "function replyMetrics(address,tuple(uint64,uint64,uint64,uint64,uint32,uint32,uint32,uint32,bool)[])",
    "function replyCallData(address,tuple(uint64,uint64,uint64,uint64,uint32,uint32,uint32,uint32,bool),bytes32,bytes)",
  "function wrapId(uint) returns (address)"
]);