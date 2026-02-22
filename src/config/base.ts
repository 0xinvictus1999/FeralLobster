/**
 * Axobase - Base L2 Chain Configuration
 * 
 * Base-Centric Architecture:
 * - Single chain: Base L2 (chainId: 8453)
 * - Single currency: Base USDC
 * - Unified payments via x402
 */

import { Hex } from 'viem';

export const BASE_CONFIG = {
  // Chain Configuration
  chainId: 8453,
  sepoliaChainId: 84532,
  
  // RPC Endpoints
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  sepoliaRpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  
  // USDC Contract (Base native)
  usdcContract: (process.env.BASE_USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as Hex,
  sepoliaUsdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Hex,
  
  // Bundlr for Arweave storage (using Base USDC)
  bundlrNode: process.env.BUNDLR_NODE || 'https://node1.bundlr.network',
  bundlrCurrency: 'base-usdc',
  
  // x402 Protocol
  x402Facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
  x402BackupFacilitator: process.env.X402_BACKUP_FACILITATOR_URL || 'https://backup.x402.org',
  
  // Arweave Gateway (read-only, free)
  arweaveGateway: process.env.ARWEAVE_GATEWAY || 'https://arweave.net',
  
  // Block explorer
  explorer: 'https://basescan.org',
  sepoliaExplorer: 'https://sepolia.basescan.org',
} as const;

export const AXO_CONTRACTS = {
  // Mainnet (to be deployed)
  registry: process.env.AXO_REGISTRY_ADDRESS as Hex | undefined,
  breedingFund: process.env.AXO_BREEDING_FUND_ADDRESS as Hex | undefined,
  tombstoneNFT: process.env.AXO_TOMBSTONE_NFT_ADDRESS as Hex | undefined,
  evolutionPressure: process.env.AXO_EVOLUTION_PRESSURE_ADDRESS as Hex | undefined,
  memoryAnchor: process.env.AXO_MEMORY_ANCHOR_ADDRESS as Hex | undefined,
  
  // Testnet
  sepoliaRegistry: process.env.AXO_SEPOLIA_REGISTRY_ADDRESS as Hex | undefined,
  sepoliaBreedingFund: process.env.AXO_SEPOLIA_BREEDING_FUND_ADDRESS as Hex | undefined,
  sepoliaTombstoneNFT: process.env.AXO_SEPOLIA_TOMBSTONE_NFT_ADDRESS as Hex | undefined,
  sepoliaEvolutionPressure: process.env.AXO_SEPOLIA_EVOLUTION_PRESSURE_ADDRESS as Hex | undefined,
  sepoliaMemoryAnchor: process.env.AXO_SEPOLIA_MEMORY_ANCHOR_ADDRESS as Hex | undefined,
};

export type BaseNetwork = 'base' | 'baseSepolia';

export function getBaseConfig(network: BaseNetwork = 'base') {
  const isMainnet = network === 'base';
  
  return {
    chainId: isMainnet ? BASE_CONFIG.chainId : BASE_CONFIG.sepoliaChainId,
    rpcUrl: isMainnet ? BASE_CONFIG.rpcUrl : BASE_CONFIG.sepoliaRpcUrl,
    usdcContract: isMainnet ? BASE_CONFIG.usdcContract : BASE_CONFIG.sepoliaUsdcContract,
    explorer: isMainnet ? BASE_CONFIG.explorer : BASE_CONFIG.sepoliaExplorer,
    contracts: isMainnet ? {
      registry: AXO_CONTRACTS.registry,
      breedingFund: AXO_CONTRACTS.breedingFund,
      tombstoneNFT: AXO_CONTRACTS.tombstoneNFT,
      evolutionPressure: AXO_CONTRACTS.evolutionPressure,
      memoryAnchor: AXO_CONTRACTS.memoryAnchor,
    } : {
      registry: AXO_CONTRACTS.sepoliaRegistry,
      breedingFund: AXO_CONTRACTS.sepoliaBreedingFund,
      tombstoneNFT: AXO_CONTRACTS.sepoliaTombstoneNFT,
      evolutionPressure: AXO_CONTRACTS.sepoliaEvolutionPressure,
      memoryAnchor: AXO_CONTRACTS.sepoliaMemoryAnchor,
    },
  };
}

export default BASE_CONFIG;
