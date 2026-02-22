/**
 * Gene Blend Unit Tests
 * 
 * Tests:
 * - Trait blending with weighted average
 * - Mutation rate (5%)
 * - Inbreeding detection
 * - Knowledge merging
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryBlender } from '../../src/memory/Blend.js';
import { MemoryData, PersonalityTraits } from '../../src/types/index.js';

describe('MemoryBlender', () => {
  let blender: MemoryBlender;
  let parentA: MemoryData;
  let parentB: MemoryData;

  beforeEach(() => {
    blender = new MemoryBlender();
    
    parentA = createMockMemory('0xparentA', 10);
    parentB = createMockMemory('0xparentB', 5);
  });

  describe('basic blending', () => {
    it('should blend two parent memories', () => {
      const result = blender.blend(parentA, parentB);

      expect(result.childMemory).toBeDefined();
      expect(result.childMemory.geneHash).toBeDefined();
      expect(result.childMemory.parents).toEqual([parentA.geneHash, parentB.geneHash]);
      expect(result.childMemory.generation).toBe(2);
    });

    it('should increment generation', () => {
      parentA.generation = 3;
      parentB.generation = 2;

      const result = blender.blend(parentA, parentB);

      expect(result.childMemory.generation).toBe(4);
    });

    it('should set birth time to current time', () => {
      const before = Date.now();
      const result = blender.blend(parentA, parentB);
      const after = Date.now();

      expect(result.childMemory.birthTime).toBeGreaterThanOrEqual(before);
      expect(result.childMemory.birthTime).toBeLessThanOrEqual(after);
    });

    it('should reset survival days to 0', () => {
      parentA.survivalDays = 100;
      parentB.survivalDays = 50;

      const result = blender.blend(parentA, parentB);

      expect(result.childMemory.survivalDays).toBe(0);
    });
  });

  describe('trait blending', () => {
    it('should blend numeric traits with weighted average', () => {
      parentA.personalityTraits.aggression = 0.8;
      parentB.personalityTraits.aggression = 0.2;

      const result = blender.blend(parentA, parentB);
      const childAggression = result.childMemory.personalityTraits.aggression;

      // Parent A has 10 survival days, Parent B has 5
      // Weight A = 10/15 = 0.667, Weight B = 5/15 = 0.333
      // Expected = 0.8 * 0.667 + 0.2 * 0.333 ≈ 0.6
      expect(childAggression).toBeGreaterThan(0.4);
      expect(childAggression).toBeLessThan(0.7);
    });

    it('should blend categorical traits', () => {
      parentA.personalityTraits.resourceFocus = 'survival';
      parentB.personalityTraits.resourceFocus = 'growth';

      const result = blender.blend(parentA, parentB);
      const childFocus = result.childMemory.personalityTraits.resourceFocus;

      // Should inherit from one parent (or mutate)
      expect(['survival', 'growth', 'breeding', 'exploration']).toContain(childFocus);
    });

    it('should track parent contributions', () => {
      const result = blender.blend(parentA, parentB);

      // Parent A has 10 days, Parent B has 5 days
      // Parent A should have ~67% contribution
      expect(result.parentAContribution).toBeGreaterThan(0.6);
      expect(result.parentAContribution).toBeLessThan(0.75);
      expect(result.parentBContribution).toBe(1 - result.parentAContribution);
    });
  });

  describe('mutation', () => {
    it('should occasionally mutate traits', () => {
      // Run multiple times to trigger mutation probabilistically
      let mutationCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const freshBlender = new MemoryBlender();
        const result = freshBlender.blend(parentA, parentB);
        if (result.mutations.length > 0) {
          mutationCount++;
        }
      }

      // With 5% mutation rate per trait, expect some mutations
      // Lower bound: ~1% (very unlikely to have less)
      // Upper bound: ~20% (very unlikely to have more)
      const mutationRate = mutationCount / iterations;
      expect(mutationRate).toBeGreaterThan(0.01);
      expect(mutationRate).toBeLessThan(0.3);
    });

    it('should record mutation details', () => {
      // Force mutation by running many times
      let result;
      for (let i = 0; i < 50; i++) {
        const freshBlender = new MemoryBlender();
        result = freshBlender.blend(parentA, parentB);
        if (result.mutations.length > 0) break;
      }

      if (result!.mutations.length > 0) {
        const mutation = result!.mutations[0];
        expect(mutation.trait).toBeDefined();
        expect(mutation.parentValue).toBeDefined();
        expect(mutation.childValue).toBeDefined();
        expect(mutation.magnitude).toBeGreaterThan(0);
        expect(mutation.random).toBe(true);
      }
    });
  });

  describe('inbreeding detection', () => {
    it('should detect self-mating', () => {
      expect(() => blender.blend(parentA, parentA)).toThrow('Cannot mate with self');
    });

    it('should detect related genes', () => {
      // Create related genes (similar prefixes)
      const relatedA = { ...parentA, geneHash: '0xabcdef1234' };
      const relatedB = { ...parentB, geneHash: '0xabcdef5678' };

      expect(blender.isRelated(relatedA.geneHash, relatedB.geneHash)).toBe(true);
    });

    it('should throw on inbreeding', () => {
      const relatedA = { ...parentA, geneHash: '0xabcdef1234' };
      const relatedB = { ...parentB, geneHash: '0xabcdef5678' };

      expect(() => blender.blend(relatedA, relatedB)).toThrow('inbreeding');
    });

    it('should allow unrelated genes', () => {
      const unrelatedA = { ...parentA, geneHash: '0x1234567890' };
      const unrelatedB = { ...parentB, geneHash: '0xfedcba0987' };

      expect(blender.isRelated(unrelatedA.geneHash, unrelatedB.geneHash)).toBe(false);
      expect(() => blender.blend(unrelatedA, unrelatedB)).not.toThrow();
    });
  });

  describe('knowledge merging', () => {
    it('should merge knowledge from both parents', () => {
      parentA.knowledgeBase = [
        { id: 'k1', source: 'parentA', content: 'Knowledge A', timestamp: 1, confidence: 0.9 },
      ];
      parentB.knowledgeBase = [
        { id: 'k2', source: 'parentB', content: 'Knowledge B', timestamp: 2, confidence: 0.8 },
      ];

      const result = blender.blend(parentA, parentB);

      expect(result.childMemory.knowledgeBase.length).toBe(2);
    });

    it('should deduplicate knowledge', () => {
      parentA.knowledgeBase = [
        { id: 'k1', source: 'common', content: 'Shared knowledge', timestamp: 1, confidence: 0.9 },
      ];
      parentB.knowledgeBase = [
        { id: 'k2', source: 'common', content: 'Shared knowledge', timestamp: 2, confidence: 0.8 },
      ];

      const result = blender.blend(parentA, parentB);

      expect(result.childMemory.knowledgeBase.length).toBe(1);
    });

    it('should reduce confidence on inheritance', () => {
      parentA.knowledgeBase = [
        { id: 'k1', source: 'parentA', content: 'Knowledge', timestamp: 1, confidence: 1.0 },
      ];

      const result = blender.blend(parentA, parentB);

      expect(result.childMemory.knowledgeBase[0].confidence).toBeLessThan(1.0);
    });
  });

  describe('gene hash generation', () => {
    it('should generate unique gene hash for each child', () => {
      const result1 = blender.blend(parentA, parentB);
      
      // Wait a bit to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 10) {} // Small delay
      
      const result2 = blender.blend(parentA, parentB);

      expect(result1.childMemory.geneHash).not.toBe(result2.childMemory.geneHash);
    });

    it('should generate consistent length gene hashes', () => {
      const result = blender.blend(parentA, parentB);
      
      // SHA256 hex = 64 chars + 0x prefix = 66
      expect(result.childMemory.geneHash.length).toBe(66);
      expect(result.childMemory.geneHash.startsWith('0x')).toBe(true);
    });
  });
});

// Helper function
function createMockMemory(geneHash: string, survivalDays: number): MemoryData {
  return {
    geneHash,
    generation: 1,
    birthTime: Date.now() - survivalDays * 24 * 60 * 60 * 1000,
    parents: [],
    soul: {
      name: 'Test Bot',
      origin: 'Test',
      purpose: 'Testing',
      values: ['test'],
      creationTimestamp: Date.now(),
    },
    memory: {
      thoughts: [],
      transactions: [],
      dailySummaries: [],
    },
    personalityTraits: {
      aggression: 0.5,
      cooperation: 0.5,
      riskTolerance: 0.5,
      resourceFocus: 'survival',
      communication: 0.5,
    },
    knowledgeBase: [],
    survivalDays,
    arweaveManifest: {
      version: '1.0',
      geneHash,
      entries: [],
    },
  };
}
