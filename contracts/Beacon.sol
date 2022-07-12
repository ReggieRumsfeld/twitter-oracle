//SPDX-License-Identifier: MIT License
pragma solidity ^0.8.0;

import "hardhat/console.sol";

// DUMMY BEACON to replaced with beacon from FreezeOrBreeze repo,
// Allowing a incremental decentralization wrapper wallet to be created 
// at a deterministic address (create2) with known, id (twitter/discord/telegram) 
// related salt (to use as standard)

contract Beacon {

    address deployer;

    constructor() {
        deployer = address(this); // Just to have a dummy value
    }

    // More likely to be placed on the factory (requirement after calling create2)
    function computeAddress(uint platformId) external view returns (address) {
        bytes memory byteCode = "0x00"; // dummy creation code
        string memory platform = "twitter";
        uint salt = uint(keccak256(abi.encodePacked(platform, platformId))); // use bytes32
        bytes32 rawAddress = keccak256(abi.encodePacked(bytes1(0xff),deployer,salt,keccak256(byteCode))); // !! DUMMY VALUE
        address create2 = address(uint160(uint256(rawAddress)));
        console.log(create2);
        return create2;
    }

}