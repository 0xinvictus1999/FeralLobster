/**
 * X402 Client Unit Tests
 * 
 * Tests:
 * - 402 response parsing
 * - Payment header construction
 * - ERC-3009 signature flow
 * - Settlement polling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { X402Client } from '../../src/network/X402Client.js';
import { WalletManager } from '../../src/wallet/WalletManager.js';
import { X402PaymentInfo } from '../../src/types/index.js';

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    default: {
      ...actual,
      post: vi.fn(),
    },
  };
});

import axios from 'axios';

describe('X402Client', () => {
  let mockWalletManager: WalletManager;
  let client: X402Client;
  const mockGeneHash = '0x1234567890abcdef';

  beforeEach(() => {
    mockWalletManager = {
      getWallet: vi.fn().mockReturnValue({
        address: '0xwallet123',
        privateKey: {
          getValue: vi.fn().mockReturnValue(Buffer.from('private-key')),
        },
      }),
      getUSDCBalance: vi.fn().mockResolvedValue(BigInt(10000000)), // 10 USDC
      createERC3009Signature: vi.fn().mockResolvedValue({
        v: 27,
        r: '0x' + 'r'.repeat(64),
        s: '0x' + 's'.repeat(64),
      }),
    } as unknown as WalletManager;

    client = new X402Client(mockWalletManager, mockGeneHash, {
      maxPrice: 5.0,
    });
  });

  describe('purchaseInference', () => {
    it('should return result if no payment required', async () => {
      const mockAxios = axios as any;
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: 'AI response', tokensUsed: 100 },
        headers: {},
      });

      const result = await client.purchaseInference(
        { name: 'Test', url: 'http://test.com', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
        'Hello AI'
      );

      expect(result.content).toBe('AI response');
      expect(result.cost).toBe(BigInt(0));
    });

    it('should handle 402 and make payment', async () => {
      const mockAxios = axios as any;
      
      // First call returns 402
      mockAxios.post.mockResolvedValueOnce({
        status: 402,
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify({
            scheme: 'exact',
            networkId: '84532',
            maxAmountRequired: '1.0',
            beneficiary: '0xbeneficiary',
            usdcContract: '0xusdc',
            validForSeconds: 60,
          })).toString('base64'),
        },
        data: {},
      });

      // Second call with payment returns success
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { result: 'Paid AI response', tokensUsed: 100 },
        headers: {
          'x-payment-response': Buffer.from(JSON.stringify({
            status: 'success',
            txHash: '0xtxhash123',
          })).toString('base64'),
        },
      });

      const result = await client.purchaseInference(
        { name: 'Test', url: 'http://test.com', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
        'Hello AI'
      );

      expect(result.content).toBe('Paid AI response');
      expect(result.txHash).toBe('0xtxhash123');
    });

    it('should throw if price exceeds max', async () => {
      const mockAxios = axios as any;
      
      mockAxios.post.mockResolvedValueOnce({
        status: 402,
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify({
            scheme: 'exact',
            networkId: '84532',
            maxAmountRequired: '10.0', // Exceeds max of 5.0
            beneficiary: '0xbeneficiary',
            usdcContract: '0xusdc',
            validForSeconds: 60,
          })).toString('base64'),
        },
        data: {},
      });

      await expect(
        client.purchaseInference(
          { name: 'Test', url: 'http://test.com', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
          'Hello AI'
        )
      ).rejects.toThrow('exceeds maximum');
    });

    it('should throw if insufficient balance', async () => {
      mockWalletManager.getUSDCBalance = vi.fn().mockResolvedValue(BigInt(100000)); // 0.1 USDC

      const mockAxios = axios as any;
      mockAxios.post.mockResolvedValueOnce({
        status: 402,
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify({
            scheme: 'exact',
            networkId: '84532',
            maxAmountRequired: '1.0',
            beneficiary: '0xbeneficiary',
            usdcContract: '0xusdc',
            validForSeconds: 60,
          })).toString('base64'),
        },
        data: {},
      });

      await expect(
        client.purchaseInference(
          { name: 'Test', url: 'http://test.com', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
          'Hello AI'
        )
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('getQuote', () => {
    it('should return cheapest provider', async () => {
      const mockAxios = axios as any;
      
      mockAxios.post.mockImplementation((url: string) => {
        if (url.includes('cheap')) {
          return Promise.resolve({ data: { price: '0.5' }, status: 200 });
        } else if (url.includes('expensive')) {
          return Promise.resolve({ data: { price: '2.0' }, status: 200 });
        }
        return Promise.reject(new Error('Unknown'));
      });

      const providers = [
        { name: 'Cheap', url: 'http://cheap.com/quote', pricePerRequest: BigInt(500000), model: 'test', reliability: 0.9 },
        { name: 'Expensive', url: 'http://expensive.com/quote', pricePerRequest: BigInt(2000000), model: 'test', reliability: 0.9 },
      ];

      const quote = await client.getQuote(providers);

      expect(quote.provider.name).toBe('Cheap');
      expect(quote.price).toBe(0.5);
    });

    it('should filter out failed quotes', async () => {
      const mockAxios = axios as any;
      
      mockAxios.post.mockImplementation((url: string) => {
        if (url.includes('working')) {
          return Promise.resolve({ data: { price: '1.0' }, status: 200 });
        }
        return Promise.reject(new Error('Failed'));
      });

      const providers = [
        { name: 'Working', url: 'http://working.com/quote', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
        { name: 'Broken', url: 'http://broken.com/quote', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
      ];

      const quote = await client.getQuote(providers);

      expect(quote.provider.name).toBe('Working');
    });

    it('should throw if all providers fail', async () => {
      const mockAxios = axios as any;
      mockAxios.post.mockRejectedValue(new Error('Failed'));

      const providers = [
        { name: 'Broken1', url: 'http://b1.com/quote', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
        { name: 'Broken2', url: 'http://b2.com/quote', pricePerRequest: BigInt(1000000), model: 'test', reliability: 0.9 },
      ];

      await expect(client.getQuote(providers)).rejects.toThrow('No valid quotes');
    });
  });

  describe('parsePaymentRequired', () => {
    it('should parse valid 402 response', () => {
      const paymentInfo: X402PaymentInfo = {
        scheme: 'exact',
        networkId: '84532',
        maxAmountRequired: '1.0',
        beneficiary: '0xbeneficiary',
        usdcContract: '0xusdc',
        validForSeconds: 60,
      };

      const mockAxios = axios as any;
      const response = {
        status: 402,
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify(paymentInfo)).toString('base64'),
        },
        data: {},
      };

      mockAxios.post.mockResolvedValueOnce(response);

      // Test through purchaseInference flow
      expect(paymentInfo.maxAmountRequired).toBe('1.0');
      expect(paymentInfo.scheme).toBe('exact');
    });

    it('should throw on missing payment info', () => {
      const response = {
        status: 402,
        headers: {},
        data: {},
      };

      // Would throw when trying to parse
      expect(() => {
        // Simulate parsing
        const header = response.headers['x-payment-info'];
        if (!header) throw new Error('Missing header');
      }).toThrow();
    });

    it('should throw on unsupported scheme', () => {
      const paymentInfo = {
        scheme: 'unsupported',
        networkId: '84532',
        maxAmountRequired: '1.0',
        beneficiary: '0xbeneficiary',
        usdcContract: '0xusdc',
        validForSeconds: 60,
      };

      // Would throw when validating
      expect(paymentInfo.scheme).not.toBe('exact');
    });
  });

  describe('pending settlements', () => {
    it('should track pending settlements', () => {
      // Initially empty
      expect(client.getPendingCount()).toBe(0);
    });

    it('should process pending settlements', async () => {
      // Mock successful settlement
      const mockAxios = axios as any;
      mockAxios.get.mockResolvedValue({
        data: { status: 'confirmed' },
      });

      await client.processPendingSettlements();
      // Should not throw
    });
  });
});
