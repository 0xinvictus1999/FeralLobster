/**
 * X402Client - Autonomous AI Payment Protocol
 * 
 * Handles:
 * - HTTP 402 Payment Required responses
 * - ERC-3009 signature generation
 * - Payment header construction
 * - Settlement polling
 * - Provider price comparison
 */

import axios, { AxiosResponse } from 'axios';
import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import {
  X402PaymentInfo,
  X402Payment,
  X402Evidence,
  InferenceProvider,
  InferenceResult,
} from '../types/index.js';

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const BACKUP_FACILITATOR_URL = process.env.X402_BACKUP_FACILITATOR_URL || 'https://backup.x402.org';
const MAX_PRICE_USDC = parseFloat(process.env.X402_MAX_PRICE_USDC || '1.0');

export interface X402Config {
  facilitatorUrl: string;
  backupFacilitatorUrl: string;
  maxPrice: number;
  maxRetries: number;
  retryDelayMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}

export class X402Client {
  private walletManager: WalletManager;
  private geneHash: string;
  private config: X402Config;
  private pendingSettlements: Map<string, X402Evidence> = new Map();

  constructor(
    walletManager: WalletManager,
    geneHash: string,
    config: Partial<X402Config> = {}
  ) {
    this.walletManager = walletManager;
    this.geneHash = geneHash;
    this.config = {
      facilitatorUrl: FACILITATOR_URL,
      backupFacilitatorUrl: BACKUP_FACILITATOR_URL,
      maxPrice: MAX_PRICE_USDC,
      maxRetries: 3,
      retryDelayMs: 1000,
      pollIntervalMs: 5000,
      pollTimeoutMs: 300000,
      ...config,
    };
  }

  /**
   * Purchase AI inference from a provider
   * Implements full x402 payment flow
   */
  async purchaseInference(
    provider: InferenceProvider,
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<InferenceResult> {
    console.log(`[X402] Purchasing inference from ${provider.name}`);

    // First request without payment (expect 402)
    const initialResponse = await this.makeRequest(provider.url, {
      prompt,
      ...options,
    });

    if (initialResponse.status !== 402) {
      // Provider didn't require payment - return result
      return {
        content: initialResponse.data.result || initialResponse.data,
        model: provider.model,
        tokensUsed: initialResponse.data.tokensUsed || 0,
        cost: BigInt(0),
        txHash: '0x0' as Hex,
      };
    }

    console.log('[X402] Received 402 Payment Required');

    // Parse payment info from 402 response
    const paymentInfo = this.parsePaymentRequired(initialResponse);
    console.log(`[X402] Payment required: ${paymentInfo.maxAmountRequired} USDC`);

    // Check price is acceptable
    const price = parseFloat(paymentInfo.maxAmountRequired);
    if (price > this.config.maxPrice) {
      throw new Error(`Price ${price} USDC exceeds maximum ${this.config.maxPrice}`);
    }

    // Get wallet
    const wallet = this.walletManager.getWallet(this.geneHash);
    if (!wallet) {
      throw new Error(`Wallet not found for ${this.geneHash}`);
    }

    // Check balance
    const balance = await this.walletManager.getUSDCBalance(wallet.address);
    const requiredAmount = BigInt(parseFloat(paymentInfo.maxAmountRequired) * 1e6);
    if (balance < requiredAmount) {
      throw new Error(`Insufficient balance: ${balance} < ${requiredAmount}`);
    }

    // Create ERC-3009 signature
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60; // Valid from 1 minute ago
    const validBefore = now + 60; // Valid for 1 minute
    const nonce = `0x${Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('hex')}` as Hex;

    const signature = await this.walletManager.createERC3009Signature(
      wallet.address,
      paymentInfo.beneficiary,
      requiredAmount,
      validAfter,
      validBefore,
      nonce,
      wallet.privateKey
    );

    // Construct payment header
    const payment: X402Payment = {
      scheme: 'exact',
      networkId: paymentInfo.networkId,
      payload: {
        signature: `${signature.r}${signature.s.slice(2)}${signature.v.toString(16).padStart(2, '0')}` as Hex,
        authorization: {
          from: wallet.address,
          to: paymentInfo.beneficiary,
          value: paymentInfo.maxAmountRequired,
          validAfter,
          validBefore,
          nonce,
        },
      },
    };

    const paymentHeader = Buffer.from(JSON.stringify(payment)).toString('base64');

    // Retry request with payment
    console.log('[X402] Retrying with payment header');
    const paidResponse = await this.makeRequest(
      provider.url,
      {
        prompt,
        ...options,
      },
      {
        'X-PAYMENT': paymentHeader,
      }
    );

    // Check payment response
    const paymentResponse = paidResponse.headers['x-payment-response'];
    if (!paymentResponse) {
      throw new Error('No payment response header');
    }

    const responseData = JSON.parse(
      Buffer.from(paymentResponse, 'base64').toString('utf8')
    );

    if (responseData.status === 'error') {
      throw new Error(`Payment failed: ${responseData.error}`);
    }

    console.log(`[X402] Payment accepted, tx: ${responseData.txHash}`);

    // Start settlement polling
    if (responseData.txHash) {
      const evidence: X402Evidence = {
        txHash: responseData.txHash as Hex,
        networkId: paymentInfo.networkId,
        payment,
        timestamp: Date.now(),
      };
      this.pollForSettlement(evidence).catch(console.error);
    }

    return {
      content: paidResponse.data.result || paidResponse.data,
      model: provider.model,
      tokensUsed: paidResponse.data.tokensUsed || 0,
      cost: requiredAmount,
      txHash: responseData.txHash as Hex,
    };
  }

  /**
   * Get quotes from multiple providers and return best option
   */
  async getQuote(providers: InferenceProvider[]): Promise<{
    provider: InferenceProvider;
    price: number;
    estimatedLatency: number;
  }> {
    const quotes = await Promise.all(
      providers.map(async (provider) => {
        try {
          const startTime = Date.now();
          const response = await axios.post(
            `${provider.url}/quote`,
            { prompt: 'test' },
            { timeout: 5000 }
          );
          const latency = Date.now() - startTime;

          return {
            provider,
            price: parseFloat(response.data.price || '0'),
            estimatedLatency: latency,
          };
        } catch {
          return {
            provider,
            price: Infinity,
            estimatedLatency: Infinity,
          };
        }
      })
    );

    // Filter valid quotes and sort by price
    const validQuotes = quotes.filter((q) => q.price !== Infinity);
    if (validQuotes.length === 0) {
      throw new Error('No valid quotes received from any provider');
    }

    return validQuotes.sort((a, b) => a.price - b.price)[0];
  }

  /**
   * Parse 402 Payment Required response
   */
  private parsePaymentRequired(response: AxiosResponse): X402PaymentInfo {
    const paymentInfoHeader = response.headers['x-payment-info'];
    if (!paymentInfoHeader) {
      throw new Error('402 response missing X-PAYMENT-INFO header');
    }

    try {
      const decoded = Buffer.from(paymentInfoHeader, 'base64').toString('utf8');
      const paymentInfo: X402PaymentInfo = JSON.parse(decoded);

      if (paymentInfo.scheme !== 'exact') {
        throw new Error(`Unsupported scheme: ${paymentInfo.scheme}`);
      }

      return paymentInfo;
    } catch (error) {
      throw new Error(`Failed to parse payment info: ${(error as Error).message}`);
    }
  }

  /**
   * Make HTTP request to inference provider
   */
  private async makeRequest(
    url: string,
    data: any,
    headers: Record<string, string> = {}
  ): Promise<AxiosResponse> {
    return axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      validateStatus: () => true, // Don't throw on error status
      timeout: 30000,
    });
  }

  /**
   * Poll for payment settlement
   */
  private async pollForSettlement(evidence: X402Evidence): Promise<boolean> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      if (Date.now() - startTime > this.config.pollTimeoutMs) {
        console.warn('[X402] Settlement polling timeout');
        this.pendingSettlements.set(evidence.txHash, evidence);
        return false;
      }

      try {
        const response = await axios.get(
          `${this.config.facilitatorUrl}/status/${evidence.txHash}`,
          { timeout: 10000 }
        );

        if (response.data.status === 'confirmed') {
          console.log(`[X402] Payment confirmed: ${evidence.txHash}`);
          return true;
        }

        if (response.data.status === 'failed') {
          throw new Error(`Settlement failed: ${response.data.error}`);
        }
      } catch (error) {
        // Ignore polling errors, keep trying
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }

    // Store for later retry
    this.pendingSettlements.set(evidence.txHash, evidence);
    return false;
  }

  /**
   * Retry pending settlements
   */
  async processPendingSettlements(): Promise<void> {
    if (this.pendingSettlements.size === 0) return;

    console.log(`[X402] Processing ${this.pendingSettlements.size} pending settlements`);

    for (const [txHash, evidence] of this.pendingSettlements) {
      try {
        const success = await this.pollForSettlement(evidence);
        if (success) {
          this.pendingSettlements.delete(txHash);
        }
      } catch (error) {
        console.error(`[X402] Failed to process ${txHash}:`, error);
      }
    }
  }

  /**
   * Get pending settlement count
   */
  getPendingCount(): number {
    return this.pendingSettlements.size;
  }
}

export default X402Client;
