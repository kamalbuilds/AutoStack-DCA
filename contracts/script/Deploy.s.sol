// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AutoStackDCA.sol";

contract DeployAutoStackDCA is Script {
    function run() external returns (AutoStackDCA) {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        AutoStackDCA autoStackDCA = new AutoStackDCA();

        console.log("AutoStackDCA deployed at:", address(autoStackDCA));

        vm.stopBroadcast();

        return autoStackDCA;
    }
}
