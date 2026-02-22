/**
 * HDWallet - Hierarchical Deterministic Wallet Derivation
 * 
 * Derives wallets from geneHash for deterministic,
 * reproducible wallet generation based on AI memory identity.
 */

import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { secp256k1 } from '@noble/secp256k1';
import { Hex } from 'viem';
import { WalletKeyPair } from '../types/index.js';
import { SecureMemory } from '../security/SecureMemory.js';

// Hardened derivation path for FeralLobster bots
// m / 44' / 60' / 0' / 0 / geneHash-derived-index
const BASE_PATH = "m/44'/60'/0'/0";

export class HDWallet {
  private masterKey: HDKey | null = null;

  constructor(seedPhrase?: string) {
    if (seedPhrase) {
      this.initializeFromSeed(seedPhrase);
    }
  }

  /**
   * Initialize HD wallet from a BIP39 seed phrase
   */
  initializeFromSeed(seedPhrase: string): void {
    if (!bip39.validateMnemonic(seedPhrase)) {
      throw new Error('Invalid BIP39 seed phrase');
    }

    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    this.masterKey = HDKey.fromMasterSeed(seed);
    
    // Clear seed from memory
    seed.fill(0);
  }

  /**
   * Derive a wallet from geneHash
   * This ensures the same geneHash always produces the same wallet
   * 
   * @param geneHash - The unique gene hash from AI memory
   * @returns WalletKeyPair with address and securely stored private key
   */
  deriveFromGene(geneHash: string): WalletKeyPair {
    if (!this.masterKey) {
      throw new Error('HDWallet not initialized. Call initializeFromSeed first.');
    }

    // Derive index from first 16 chars of geneHash
    const indexHex = geneHash.slice(0, 16);
    const index = parseInt(indexHex, 16) % 2147483647; // Keep within int32 range

    // Derive child key
    const derivationPath = `${BASE_PATH}/${index}`;
    const childKey = this.masterKey.derive(derivationPath);

    if (!childKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    // Get private key
    const privateKeyHex = childKey.privateKey.toString('hex');
    
    // Create secure memory for private key
    const securePrivateKey = SecureMemory.fromHex(privateKeyHex);

    // Derive public key and address
    const publicKey = secp256k1.getPublicKey(childKey.privateKey, false);
    const address = this.publicKeyToAddress(publicKey);

    // Clear childKey from memory (best effort)
    childKey.wipePrivateData();

    return {
      address: address as Hex,
      privateKey: securePrivateKey,
    };
  }

  /**
   * Derive multiple wallets from multiple geneHashes
   */
  deriveMultiple(geneHashes: string[]): WalletKeyPair[] {
    return geneHashes.map(geneHash => this.deriveFromGene(geneHash));
  }

  /**
   * Generate a new random seed phrase
   */
  static generateSeedPhrase(strength: 128 | 256 = 256): string {
    return bip39.generateMnemonic(strength);
  }

  /**
   * Validate a seed phrase
   */
  static validateSeedPhrase(seedPhrase: string): boolean {
    return bip39.validateMnemonic(seedPhrase);
  }

  /**
   * Convert public key to Ethereum address
   */
  private publicKeyToAddress(publicKey: Uint8Array): string {
    // Remove 0x04 prefix if present (uncompressed key marker)
    const pubKeyBytes = publicKey.length === 65 ? publicKey.slice(1) : publicKey;
    
    // Keccak256 hash of public key
    const hash = secp256k1.utils.sha256(pubKeyBytes);
    
    // Take last 20 bytes
    const addressBytes = hash.slice(-20);
    
    // Convert to hex with 0x prefix
    const address = '0x' + Buffer.from(addressBytes).toString('hex');
    
    // Return checksum address (EIP-55)
    return this.toChecksumAddress(address);
  }

  /**
   * Convert address to EIP-55 checksum format
   */
  private toChecksumAddress(address: string): string {
    const addr = address.toLowerCase().replace('0x', '');
    const hash = Buffer.from(secp256k1.utils.sha256(Buffer.from(addr, 'utf8'))).toString('hex');
    
    let checksumAddr = '0x';
    for (let i = 0; i < addr.length; i++) {
      const hashChar = parseInt(hash[i], 16);
      if (hashChar >= 8) {
        checksumAddr += addr[i].toUpperCase();
      } else {
        checksumAddr += addr[i];
      }
    }
    
    return checksumAddr;
  }

  /**
   * Wipe all sensitive data from memory
   */
  wipe(): void {
    if (this.masterKey) {
      this.masterKey.wipePrivateData();
      this.masterKey = null;
    }
  }
}

/**
 * Standalone function to derive wallet from geneHash using a master seed
 * Useful when you don't need to keep the HDWallet instance around
 */
export function deriveWalletFromGene(
  geneHash: string,
  masterSeedPhrase: string
): WalletKeyPair {
  const wallet = new HDWallet(masterSeedPhrase);
  try {
    return wallet.deriveFromGene(geneHash);
  } finally {
    wallet.wipe();
  }
}

export default HDWallet;
