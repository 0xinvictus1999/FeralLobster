/**
 * Axobase Contract Deployment Script
 * 
 * Deploys:
 * 1. AxoRegistry - Bot registry
 * 2. BreedingFund - Breeding escrow
 * 3. TombstoneNFT - Death certificates
 * 4. EvolutionPressure - Evolution parameters
 */

import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main(hre: HardhatRuntimeEnvironment) {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying Axobase contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);

  // Get USDC address for network
  const usdcAddress = getUSDCAddress(hre.network.name);
  console.log("USDC Address:", usdcAddress);

  // 1. Deploy AxoRegistry
  console.log("\n1. Deploying AxoRegistry...");
  const AxoRegistry = await hre.ethers.getContractFactory("AxoRegistry");
  const registry = await AxoRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AxoRegistry deployed to:", registryAddress);

  // 2. Deploy BreedingFund
  console.log("\n2. Deploying BreedingFund...");
  const BreedingFund = await hre.ethers.getContractFactory("BreedingFund");
  const breedingFund = await BreedingFund.deploy(usdcAddress);
  await breedingFund.waitForDeployment();
  const breedingFundAddress = await breedingFund.getAddress();
  console.log("BreedingFund deployed to:", breedingFundAddress);

  // 3. Deploy TombstoneNFT
  console.log("\n3. Deploying TombstoneNFT...");
  const TombstoneNFT = await hre.ethers.getContractFactory("TombstoneNFT");
  const tombstoneNFT = await TombstoneNFT.deploy(usdcAddress, deployer.address);
  await tombstoneNFT.waitForDeployment();
  const tombstoneAddress = await tombstoneNFT.getAddress();
  console.log("TombstoneNFT deployed to:", tombstoneAddress);

  // 4. Deploy EvolutionPressure
  console.log("\n4. Deploying EvolutionPressure...");
  const EvolutionPressure = await hre.ethers.getContractFactory("EvolutionPressure");
  const evolutionPressure = await EvolutionPressure.deploy();
  await evolutionPressure.waitForDeployment();
  const evolutionAddress = await evolutionPressure.getAddress();
  console.log("EvolutionPressure deployed to:", evolutionAddress);

  // Setup authorizations
  console.log("\n5. Setting up authorizations...");
  
  // Authorize BreedingFund to mint in registry
  await registry.setAuthorizedMinter(breedingFundAddress, true);
  console.log("BreedingFund authorized in registry");

  // Authorize registry in BreedingFund
  await breedingFund.setAuthorizedCaller(registryAddress, true);
  console.log("Registry authorized in BreedingFund");

  // Authorize registry in TombstoneNFT
  await tombstoneNFT.setAuthorizedMinter(registryAddress, true);
  console.log("Registry authorized in TombstoneNFT");

  // Print deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Network:", hre.network.name);
  console.log("AxoRegistry:", registryAddress);
  console.log("BreedingFund:", breedingFundAddress);
  console.log("TombstoneNFT:", tombstoneAddress);
  console.log("EvolutionPressure:", evolutionAddress);
  console.log("USDC:", usdcAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AxoRegistry: registryAddress,
      BreedingFund: breedingFundAddress,
      TombstoneNFT: tombstoneAddress,
      EvolutionPressure: evolutionAddress,
      USDC: usdcAddress,
    },
  };

  console.log("\nDeployment Info (JSON):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contracts if on supported network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log("Verifying contracts...");
    
    try {
      await hre.run("verify:verify", {
        address: registryAddress,
        constructorArguments: [],
      });
      console.log("AxoRegistry verified");
    } catch (e) {
      console.log("AxoRegistry verification failed:", (e as Error).message);
    }

    try {
      await hre.run("verify:verify", {
        address: breedingFundAddress,
        constructorArguments: [usdcAddress],
      });
      console.log("BreedingFund verified");
    } catch (e) {
      console.log("BreedingFund verification failed:", (e as Error).message);
    }

    try {
      await hre.run("verify:verify", {
        address: tombstoneAddress,
        constructorArguments: [usdcAddress, deployer.address],
      });
      console.log("TombstoneNFT verified");
    } catch (e) {
      console.log("TombstoneNFT verification failed:", (e as Error).message);
    }

    try {
      await hre.run("verify:verify", {
        address: evolutionAddress,
        constructorArguments: [],
      });
      console.log("EvolutionPressure verified");
    } catch (e) {
      console.log("EvolutionPressure verification failed:", (e as Error).message);
    }
  }
}

function getUSDCAddress(network: string): string {
  switch (network) {
    case "base":
      return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    case "baseSepolia":
      return "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    case "hardhat":
    case "localhost":
      // Deploy mock USDC or use zero address for testing
      return "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// Execute if run directly
if (require.main === module) {
  main(require("hardhat"))
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
