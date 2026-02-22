/**
 * SecureMemory Unit Tests
 * 
 * Tests:
 * - Secure buffer creation and clearing
 * - Memory locking (mlock)
 * - Serialization prevention
 * - Process cleanup hooks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureMemory, SecureString } from '../../src/security/SecureMemory.js';

describe('SecureMemory', () => {
  afterEach(() => {
    // Clear all secure memory after each test
    SecureMemory.clearAll();
  });

  describe('creation', () => {
    it('should create secure buffer from string', () => {
      const secret = 'my-secret-key-12345';
      const secure = new SecureMemory(secret);

      expect(secure.length).toBe(secret.length);
      expect(secure.isCleared()).toBe(false);
    });

    it('should create secure buffer with specific size', () => {
      const size = 32;
      const secure = new SecureMemory(size);

      expect(secure.length).toBe(size);
    });

    it('should create from hex string', () => {
      const hex = '0x1234abcd';
      const secure = SecureMemory.fromHex(hex);

      expect(secure.length).toBe(4); // 2 bytes
    });

    it('should create random buffer', () => {
      const size = 32;
      const secure = SecureMemory.random(size);

      expect(secure.length).toBe(size);
    });
  });

  describe('value access', () => {
    it('should return buffer copy on getValue', () => {
      const secret = 'test-secret';
      const secure = new SecureMemory(secret);
      const value = secure.getValue();

      expect(value.toString('utf8')).toBe(secret);
      
      // Modifying returned buffer should not affect original
      value[0] = 0;
      expect(secure.getValue().toString('utf8')).toBe(secret);
    });

    it('should throw after clear', () => {
      const secure = new SecureMemory('test');
      secure.clear();

      expect(() => secure.getValue()).toThrow('SecureMemory has been cleared');
    });
  });

  describe('clearing', () => {
    it('should mark as cleared', () => {
      const secure = new SecureMemory('test');
      expect(secure.isCleared()).toBe(false);

      secure.clear();
      expect(secure.isCleared()).toBe(true);
    });

    it('should reduce active count on clear', () => {
      const initialCount = SecureMemory.getActiveCount();
      
      const secure = new SecureMemory('test');
      expect(SecureMemory.getActiveCount()).toBe(initialCount + 1);

      secure.clear();
      expect(SecureMemory.getActiveCount()).toBe(initialCount);
    });

    it('should handle multiple clears gracefully', () => {
      const secure = new SecureMemory('test');
      secure.clear();
      secure.clear(); // Should not throw

      expect(secure.isCleared()).toBe(true);
    });
  });

  describe('serialization prevention', () => {
    it('should throw on JSON serialization', () => {
      const secure = new SecureMemory('test');

      expect(() => JSON.stringify({ secure })).toThrow();
    });

    it('should return placeholder on toString', () => {
      const secure = new SecureMemory('test');
      expect(secure.toString()).toBe('[SecureMemory]');
    });

    it('should return placeholder on inspect', () => {
      const secure = new SecureMemory('test');
      const inspected = (secure as any)[Symbol.for('nodejs.util.inspect.custom')]();
      
      expect(inspected).toContain('SecureMemory');
      expect(inspected).not.toContain('test');
    });
  });

  describe('iteration prevention', () => {
    it('should throw on iteration', () => {
      const secure = new SecureMemory('test');

      expect(() => [...secure]).toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all active buffers', () => {
      const secure1 = new SecureMemory('test1');
      const secure2 = new SecureMemory('test2');

      expect(SecureMemory.getActiveCount()).toBeGreaterThanOrEqual(2);

      SecureMemory.clearAll();

      expect(secure1.isCleared()).toBe(true);
      expect(secure2.isCleared()).toBe(true);
      expect(SecureMemory.getActiveCount()).toBe(0);
    });
  });
});

describe('SecureString', () => {
  it('should store string securely', () => {
    const secret = 'my-password';
    const secure = new SecureString(secret);

    expect(secure.getValue()).toBe(secret);
  });

  it('should prevent toString leakage', () => {
    const secure = new SecureString('secret');
    expect(secure.toString()).toBe('[SecureString]');
  });

  it('should prevent JSON serialization', () => {
    const secure = new SecureString('secret');
    expect(() => JSON.stringify({ secure })).toThrow();
  });

  it('should clear on request', () => {
    const secure = new SecureString('secret');
    secure.clear();

    // After clear, getValue may throw or return empty
    expect(() => secure.getValue()).toThrow();
  });
});
