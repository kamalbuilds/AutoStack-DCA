// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SmartMoneyDCA.sol";

contract DeploySmartMoneyDCA is Script {
    function run() external returns (SmartMoneyDCA) {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Uniswap V3 SwapRouter on Base Sepolia (placeholder - use actual address)
        address dexRouter = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4; // Base Sepolia SwapRouter02

        // Fee recipient - set to deployer for now
        address feeRecipient = deployer;

        console.log("Deployer:", deployer);
        console.log("DEX Router:", dexRouter);
        console.log("Fee Recipient:", feeRecipient);

        vm.startBroadcast(deployerPrivateKey);

        SmartMoneyDCA smartMoneyDCA = new SmartMoneyDCA(dexRouter, feeRecipient);

        console.log("SmartMoneyDCA deployed at:", address(smartMoneyDCA));

        vm.stopBroadcast();

        return smartMoneyDCA;
    }
}
