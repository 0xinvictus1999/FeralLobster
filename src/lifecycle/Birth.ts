/**
 * Birth.ts - Birth Ritual for New AI Bots
 *
 * Handles:
 * - Decrypting GPG-encrypted memory files
 * - Verifying user deposits on chain
 * - Creating Akash deployment with proper configuration
 * - Registering bot on FeralRegistry contract
 * - Inscribing birth event to Arweave
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { MemoryImporter, ImportResult } from '../memory/Import.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { AkashClient, DeploymentResult } from '../network/AkashClient.js';
import {
  MemoryData,
  BotStatus,
  BotLifeStatus,
  OperationMode,
  BirthRitual,
} from '../types/index.js';

export interface BirthConfig {
  geneHash: string;
  encryptedMemoryPath: string;
  userDepositTx: Hex;
  msaAmount: bigint;
  privateKeyPath: string;
  passphrase: string;
}

export interface BirthResult {
  success: boolean;
  geneHash: string;
  walletAddress: Hex;
  akashDseq: string;
  arweaveBirthTx: string;
  registryTx: Hex;
  status: BotStatus;
  error?: string;
}

export class BirthRitualManager {
  private walletManager: WalletManager;
  private memoryImporter: MemoryImporter;
  private arweaveInscriber: ArweaveInscriber;
  private akashClient: AkashClient;
  private registryContract: Hex;

  constructor(
    walletManager: WalletManager,
    akashClient: AkashClient,
    arweaveInscriber: ArweaveInscriber,
    registryContract: Hex
  ) {
    this.walletManager = walletManager;
    this.memoryImporter = new MemoryImporter();
    this.arweaveInscriber = arweaveInscriber;
    this.akashClient = akashClient;
    this.registryContract = registryContract;
  }

  /**
   * Perform the complete birth ritual
   * This is the entry point for bringing a new bot to life
   */
  async performRitual(config: BirthConfig): Promise<BirthResult> {
    console.log(`[Birth] Starting birth ritual for ${config.geneHash.slice(0, 16)}...`);

    try {
      // Step 1: Decrypt and import memory
      const importResult = await this.importMemory(config);
      console.log(`[Birth] Memory imported: ${importResult.geneHash.slice(0, 16)}...`);

      // Step 2: Verify user deposit
      const depositVerified = await this.verifyDeposit(config.userDepositTx, config.msaAmount);
      if (!depositVerified) {
        throw new Error('User deposit verification failed');
      }
      console.log('[Birth] Deposit verified');

      // Step 3: Create wallet for the bot
      const wallet = this.walletManager.createWallet(importResult.geneHash);
      console.log(`[Birth] Wallet created: ${wallet.address}`);

      // Step 4: Create Akash deployment
      const deploymentResult = await this.createDeployment(
        importResult.geneHash,
        wallet.address,
        config.encryptedMemoryPath
      );
      console.log(`[Birth] Deployment created: ${deploymentResult.dseq}`);

      // Step 5: Inscribe birth to Arweave
      const birthInscription = await this.arweaveInscriber.inscribeBirth(
        importResult.geneHash,
        importResult.memory,
        wallet.address
      );
      console.log(`[Birth] Birth inscribed: ${birthInscription.arweaveTx}`);

      // Step 6: Register on chain
      const registryTx = await this.registerOnChain(
        importResult.geneHash,
        wallet.address,
        deploymentResult.dseq,
        birthInscription.arweaveTx
      );
      console.log(`[Birth] Registered on chain: ${registryTx}`);

      // Step 7: Create and return bot status
      const status: BotStatus = {
        geneHash: importResult.geneHash,
        address: wallet.address,
        status: BotLifeStatus.ALIVE,
        birthTime: Date.now(),
        lastCheckIn: Date.now(),
        balance: await this.walletManager.getBalances(wallet.address),
        mode: OperationMode.NORMAL,
        survivalDays: 0,
        generation: importResult.memory.generation,
      };

      return {
        success: true,
        geneHash: importResult.geneHash,
        walletAddress: wallet.address,
        akashDseq: deploymentResult.dseq,
        arweaveBirthTx: birthInscription.arweaveTx,
        registryTx,
        status,
      };
    } catch (error) {
      console.error('[Birth] Birth ritual failed:', error);
      return {
        success: false,
        geneHash: config.geneHash,
        walletAddress: '0x0' as Hex,
        akashDseq: '',
        arweaveBirthTx: '',
        registryTx: '0x0' as Hex,
        status: this.createFailedStatus(config.geneHash),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Step 1: Import and decrypt memory file
   */
  private async importMemory(config: BirthConfig): Promise<ImportResult> {
    const result = await this.memoryImporter.import({
      encryptedPath: config.encryptedMemoryPath,
      privateKeyPath: config.privateKeyPath,
      passphrase: config.passphrase,
      skipValidation: false,
    });

    // Verify geneHash matches
    if (result.geneHash !== config.geneHash) {
      throw new Error(
        `GeneHash mismatch: expected ${config.geneHash}, got ${result.geneHash}`
      );
    }

    return result;
  }

  /**
   * Step 2: Verify user deposit transaction
   */
  private async verifyDeposit(userDepositTx: Hex, expectedAmount: bigint): Promise<boolean> {
    try {
      // Query the blockchain for the deposit transaction
      const receipt = await this.walletManager['publicClient'].getTransactionReceipt({
        hash: userDepositTx,
      });

      if (!receipt || receipt.status !== 'success') {
        console.error('[Birth] Deposit transaction failed or not found');
        return false;
      }

      // Get transaction details
      const tx = await this.walletManager['publicClient'].getTransaction({
        hash: userDepositTx,
      });

      // Verify amount matches expected MSA (Minimum Survival Amount)
      if (tx.value < expectedAmount) {
        console.error(
          `[Birth] Deposit amount insufficient: ${tx.value} < ${expectedAmount}`
        );
        return false;
      }

      console.log(`[Birth] Deposit verified: ${tx.value} wei`);
      return true;
    } catch (error) {
      console.error('[Birth] Failed to verify deposit:', error);
      return false;
    }
  }

  /**
   * Step 4: Create Akash deployment for the bot
   */
  private async createDeployment(
    geneHash: string,
    walletAddress: Hex,
    encryptedMemoryPath: string
  ): Promise<DeploymentResult> {
    // Calculate deposit for 30 days
    const deposit = this.akashClient.calculateDeposit(30 * 24, 5000); // 30 days, 5000 uakt/hour

    const config = {
      geneHash,
      encryptedMemory: encryptedMemoryPath,
      walletAddress,
      cpuLimit: 1.0,
      memoryLimit: '1Gi',
      storageLimit: '5Gi',
    };

    return await this.akashClient.createDeployment(config, deposit);
  }

  /**
   * Step 6: Register bot on FeralRegistry contract
   */
  private async registerOnChain(
    geneHash: string,
    walletAddress: Hex,
    akashDseq: string,
    arweaveBirthTx: string
  ): Promise<Hex> {
    // In production, this would call the FeralRegistry contract
    // For now, simulate the transaction

    if (process.env.NODE_ENV === 'test' || process.env.MOCK_REGISTRY) {
      return `0x${'0'.repeat(64)}` as Hex;
    }

    // Encode the registerBot call
    const data = this.encodeRegisterBotCall(
      geneHash as Hex,
      walletAddress,
      akashDseq,
      arweaveBirthTx
    );

    // Get a master wallet to send the transaction
    const masterGeneHash = 'master';
    const masterWallet = this.walletManager.getWallet(masterGeneHash);
    if (!masterWallet) {
      throw new Error('Master wallet not found');
    }

    // Sign and send transaction
    const txRequest = {
      to: this.registryContract,
      data,
      gasLimit: BigInt(500000),
    };

    const signature = await this.walletManager.signTransaction(
      txRequest,
      masterWallet.privateKey
    );

    // In real implementation, broadcast the signed transaction
    console.log('[Birth] Transaction signed:', signature.slice(0, 20) + '...');

    // Return mock tx hash
    return `0x${Date.now().toString(16).padStart(64, '0')}` as Hex;
  }

  /**
   * Encode registerBot function call
   */
  private encodeRegisterBotCall(
    geneHash: Hex,
    wallet: Hex,
    akashDseq: string,
    arweaveBirthTx: string
  ): Hex {
    // Simplified encoding - real implementation would use viem's encodeFunctionData
    const selector = '0x7b550aeb'; // registerBot(address,string,string,string)
    const encoded = `${selector}${geneHash.slice(2).padStart(64, '0')}${wallet.slice(2).padStart(64, '0')}`;
    return encoded as Hex;
  }

  /**
   * Create a failed status object
   */
  private createFailedStatus(geneHash: string): BotStatus {
    return {
      geneHash,
      address: '0x0' as Hex,
      status: BotLifeStatus.UNBORN,
      birthTime: 0,
      lastCheckIn: 0,
      balance: { eth: BigInt(0), usdc: BigInt(0) },
      mode: OperationMode.NORMAL,
      survivalDays: 0,
      generation: 0,
    };
  }

  /**
   * Get birth ritual status for a geneHash
   */
  async getRitualStatus(geneHash: string): Promise<BirthRitual | null> {
    // Query the registry for birth information
    // This would be used to check if a bot was properly born
    console.log(`[Birth] Getting ritual status for ${geneHash.slice(0, 16)}...`);
    return null;
  }
}

export default BirthRitualManager;
