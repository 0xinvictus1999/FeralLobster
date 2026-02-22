/**
 * GPGVault - GPG Encryption/Decryption for Memory Export/Import
 * 
 * Uses OpenPGP.js for:
 * - Encrypting memory exports with platform RSA public key
 * - Decrypting memory imports with private key and passphrase
 */

import * as openpgp from 'openpgp';
import { EncryptedData } from '../types/index.js';

export interface GPGKeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

export class GPGVault {
  private platformPublicKey: string | null = null;

  constructor() {
    // Load platform public key from environment if available
    const envKey = process.env.PLATFORM_GPG_PUBLIC_KEY;
    if (envKey) {
      this.platformPublicKey = envKey.replace(/\\n/g, '\n');
    }
  }

  /**
   * Set the platform public key for encryption
   */
  setPlatformPublicKey(publicKeyArmored: string): void {
    this.platformPublicKey = publicKeyArmored;
  }

  /**
   * Get the platform public key
   */
  getPlatformPublicKey(): string | null {
    return this.platformPublicKey;
  }

  /**
   * Encrypt data using platform RSA public key
   * @param data - Raw data buffer to encrypt
   * @param publicKeyArmored - Optional custom public key (defaults to platform key)
   * @returns ASCII-armored encrypted string
   */
  async encrypt(data: Buffer, publicKeyArmored?: string): Promise<string> {
    const keyToUse = publicKeyArmored || this.platformPublicKey;
    
    if (!keyToUse) {
      throw new Error('No GPG public key available. Set PLATFORM_GPG_PUBLIC_KEY or pass publicKeyArmored.');
    }

    try {
      // Read the public key
      const publicKey = await openpgp.readKey({ armoredKey: keyToUse });

      // Create message from buffer
      const message = await openpgp.createMessage({ binary: data });

      // Encrypt with the public key
      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey,
        format: 'binary',
      });

      // Convert to base64 for ASCII armoring
      const encryptedBuffer = Buffer.from(encrypted as Uint8Array);
      const armored = this.enarmor(encryptedBuffer, publicKey.getFingerprint().toUpperCase());

      return armored;
    } catch (error) {
      throw new Error(`GPG encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt data using private key and passphrase
   * @param encryptedArmored - ASCII-armored encrypted data
   * @param privateKeyArmored - Private key in ASCII armor format
   * @param passphrase - Passphrase to decrypt the private key
   * @returns Decrypted data buffer
   */
  async decrypt(
    encryptedArmored: string,
    privateKeyArmored: string,
    passphrase: string
  ): Promise<Buffer> {
    try {
      // Dearmor the encrypted data
      const encryptedBuffer = this.dearmor(encryptedArmored);

      // Read and decrypt the private key
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
        passphrase,
      });

      // Read the encrypted message
      const message = await openpgp.readMessage({
        binaryMessage: new Uint8Array(encryptedBuffer),
      });

      // Decrypt the message
      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey,
        format: 'binary',
      });

      return Buffer.from(decrypted as Uint8Array);
    } catch (error) {
      throw new Error(`GPG decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a new GPG key pair
   * @param name - User name
   * @param email - User email
   * @param passphrase - Passphrase for the private key
   * @returns Generated key pair
   */
  async generateKeyPair(
    name: string,
    email: string,
    passphrase: string
  ): Promise<GPGKeyPair> {
    try {
      const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 4096,
        userIDs: [{ name, email }],
        passphrase,
      });

      const key = await openpgp.readKey({ armoredKey: publicKey });
      const fingerprint = key.getFingerprint().toUpperCase();

      return {
        publicKey,
        privateKey,
        fingerprint,
      };
    } catch (error) {
      throw new Error(`GPG key generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract fingerprint from public key
   */
  async getFingerprint(publicKeyArmored: string): Promise<string> {
    try {
      const key = await openpgp.readKey({ armoredKey: publicKeyArmored });
      return key.getFingerprint().toUpperCase();
    } catch (error) {
      throw new Error(`Invalid GPG public key: ${(error as Error).message}`);
    }
  }

  /**
   * Verify that a key pair matches
   */
  async verifyKeyPair(
    publicKeyArmored: string,
    privateKeyArmored: string,
    passphrase: string
  ): Promise<boolean> {
    try {
      const pubKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
      const privKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
        passphrase,
      });

      return pubKey.getFingerprint() === privKey.getFingerprint();
    } catch {
      return false;
    }
  }

  /**
   * Convert binary data to ASCII-armored format
   * Similar to PGP armor
   */
  private enarmor(data: Buffer, fingerprint: string): string {
    const base64Data = data.toString('base64');
    const lines = base64Data.match(/.{1,64}/g) || [];
    
    const armor = [
      '-----BEGIN PGP MESSAGE-----',
      `Comment: FeralLobster Encrypted Memory (${fingerprint})`,
      '',
      ...lines,
      '-----END PGP MESSAGE-----',
    ].join('\n');

    return armor;
  }

  /**
   * Convert ASCII-armored format back to binary
   */
  private dearmor(armored: string): Buffer {
    const lines = armored.split('\n');
    const base64Lines: string[] = [];
    let inMessage = false;

    for (const line of lines) {
      if (line.includes('BEGIN PGP MESSAGE')) {
        inMessage = true;
        continue;
      }
      if (line.includes('END PGP MESSAGE')) {
        break;
      }
      if (inMessage && line.trim() && !line.startsWith('Comment:')) {
        base64Lines.push(line.trim());
      }
    }

    return Buffer.from(base64Lines.join(''), 'base64');
  }

  /**
   * Check if a string looks like armored GPG data
   */
  static isArmored(data: string): boolean {
    return data.includes('BEGIN PGP MESSAGE') && data.includes('END PGP MESSAGE');
  }
}

export default GPGVault;
