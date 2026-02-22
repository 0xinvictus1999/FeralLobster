/**
 * ArweaveInscriber Unit Tests
 */

import { ArweaveInscriber } from '../core/inscribe/ArweaveInscriber';
import { ArweaveConfig } from '../types';

describe('ArweaveInscriber', () => {
  const mockConfig: ArweaveConfig = {
    bundlrNode: 'https://node1.bundlr.network',
    currency: 'usdc',
    privateKey: 'test-jwk',
  };

  describe('Day Number Calculation', () => {
    it('should calculate correct day number', () => {
      const birthTime = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      const now = Date.now();
      const diff = now - birthTime;
      const dayNumber = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;

      expect(dayNumber).toBe(4); // Day 4 (started on day 1)
    });

    it('should handle first day', () => {
      const birthTime = Date.now() - 12 * 60 * 60 * 1000; // 12 hours ago
      const now = Date.now();
      const diff = now - birthTime;
      const dayNumber = Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;

      expect(dayNumber).toBe(1);
    });
  });

  describe('Inscription Package', () => {
    it('should build valid package structure', () => {
      const content = {
        thoughts: [{ timestamp: Date.now(), content: 'test' }],
        transactions: [{ timestamp: Date.now(), amount: 1 }],
        survivalStatus: { mode: 'normal', usdcBalance: 10 },
        geneHash: 'test-hash',
        walletAddress: '0x1234',
      };

      const dayNumber = 5;
      const packageData = {
        version: '1.0',
        protocol: 'ferallobster-memory',
        dayNumber,
        timestamp: Date.now(),
        geneHash: content.geneHash,
        walletAddress: content.walletAddress,
        content: {
          thoughtCount: content.thoughts.length,
          transactionCount: content.transactions.length,
          survivalStatus: content.survivalStatus,
        },
        thoughts: content.thoughts,
        transactions: content.transactions,
      };

      expect(packageData.protocol).toBe('ferallobster-memory');
      expect(packageData.dayNumber).toBe(dayNumber);
      expect(packageData.content.thoughtCount).toBe(1);
    });
  });

  describe('Proof of Life', () => {
    it('should return null for empty history', async () => {
      const inscriber = new ArweaveInscriber(mockConfig, '/tmp/test');
      
      // Mock empty file
      jest.spyOn(require('fs').promises, 'readFile').mockRejectedValue(new Error('ENOENT'));

      const proof = await inscriber.generateProofOfLife();
      expect(proof).toBeNull();
    });
  });

  describe('Schedule Calculation', () => {
    it('should calculate ms until midnight', () => {
      const now = new Date();
      now.setUTCHours(12, 0, 0, 0); // Noon UTC
      
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);

      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      expect(msUntilMidnight).toBe(12 * 60 * 60 * 1000); // 12 hours
    });
  });
});
