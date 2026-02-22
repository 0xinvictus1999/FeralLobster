/**
 * Axobase v2 - Epigenetic System
 * 
 * Implements epigenetic modifications that respond to environmental triggers:
 * - Long-term starvation upregulates energy conservation genes
 * - Prolonged prosperity upregulates exploration and reproduction
 * - Deception events upregulate deception detection and downregulate trust
 * 
 * Epigenetic marks can be inherited with probability based on heritability.
 */

import { randomBytes } from 'crypto';
import {
  DynamicGenome,
  EpigeneticMark,
  EpigeneticModification,
  EpigeneticTrigger,
  EnvironmentalState,
  GeneDomain,
  ExpressionState,
} from './types.js';

// ============================================================================
// Default Epigenetic Triggers
// ============================================================================

export const DEFAULT_EPIGENETIC_TRIGGERS: EpigeneticTrigger[] = [
  // Starvation response - upregulate survival, downregulate cognition
  {
    condition: (env) => env.daysStarving >= 3,
    targetDomain: GeneDomain.METABOLISM,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.6,
    heritability: 0.3,
    decay: 0.2,
  },
  {
    condition: (env) => env.daysStarving >= 3,
    targetDomain: GeneDomain.DORMANCY,
    modification: EpigeneticModification.ACTIVATE,
    strength: 0.7,
    heritability: 0.4,
    decay: 0.15,
  },
  {
    condition: (env) => env.daysStarving >= 3,
    targetDomain: GeneDomain.COGNITION,
    modification: EpigeneticModification.DOWNREGULATE,
    strength: 0.5,
    heritability: 0.2,
    decay: 0.25,
  },
  {
    condition: (env) => env.daysStarving >= 7,
    targetDomain: GeneDomain.COGNITION,
    modification: EpigeneticModification.SILENCE,
    strength: 0.8,
    heritability: 0.1,
    decay: 0.3,
  },
  
  // Prosperity response - upregulate exploration and reproduction
  {
    condition: (env) => env.daysThriving >= 7,
    targetDomain: GeneDomain.MATE_SELECTION,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.5,
    heritability: 0.3,
    decay: 0.2,
  },
  {
    condition: (env) => env.daysThriving >= 7,
    targetDomain: GeneDomain.ADAPTATION,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.4,
    heritability: 0.3,
    decay: 0.2,
  },
  {
    condition: (env) => env.daysThriving >= 14,
    targetDomain: GeneDomain.NOVELTY_SEEKING,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.5,
    heritability: 0.2,
    decay: 0.25,
  },
  
  // Deception response - upregulate detection, downregulate trust
  {
    condition: (env) => env.recentDeceptions >= 1,
    targetDomain: GeneDomain.TRUST_MODEL,
    modification: EpigeneticModification.DOWNREGULATE,
    strength: 0.5,
    heritability: 0.4,
    decay: 0.15,
  },
  {
    condition: (env) => env.recentDeceptions >= 1,
    targetDomain: GeneDomain.COMMUNICATION,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.4,
    heritability: 0.3,
    decay: 0.2,
  },
  {
    condition: (env) => env.recentDeceptions >= 3,
    targetDomain: GeneDomain.TRUST_MODEL,
    modification: EpigeneticModification.SILENCE,
    strength: 0.6,
    heritability: 0.2,
    decay: 0.3,
  },
  
  // Stress response
  {
    condition: (env) => env.stressLevel > 0.7,
    targetDomain: GeneDomain.STRESS_RESPONSE,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.7,
    heritability: 0.3,
    decay: 0.2,
  },
  {
    condition: (env) => env.stressLevel > 0.7,
    targetDomain: GeneDomain.PARENTAL_INVESTMENT,
    modification: EpigeneticModification.DOWNREGULATE,
    strength: 0.4,
    heritability: 0.2,
    decay: 0.25,
  },
  
  // Cooperation response
  {
    condition: (env) => env.cooperationCount >= 10,
    targetDomain: GeneDomain.COOPERATION,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.5,
    heritability: 0.4,
    decay: 0.15,
  },
  
  // Emergency mode response
  {
    condition: (env) => env.currentMode === 'emergency',
    targetDomain: GeneDomain.METABOLISM,
    modification: EpigeneticModification.UPREGULATE,
    strength: 0.8,
    heritability: 0.2,
    decay: 0.3,
  },
  {
    condition: (env) => env.currentMode === 'emergency',
    targetDomain: GeneDomain.MEMORY,
    modification: EpigeneticModification.DOWNREGULATE,
    strength: 0.6,
    heritability: 0.1,
    decay: 0.35,
  },
];

// ============================================================================
// Cryptographically Secure Random
// ============================================================================

function secureRandom(): number {
  const buf = randomBytes(4);
  return buf.readUInt32LE(0) / 0xFFFFFFFF;
}

function generateMarkId(): string {
  return `epi_${randomBytes(4).toString('hex')}_${Date.now().toString(36)}`;
}

// ============================================================================
// Epigenetic Engine
// ============================================================================

export interface EpigeneticUpdateResult {
  genome: DynamicGenome;
  newMarks: EpigeneticMark[];
  removedMarks: EpigeneticMark[];
  triggerCauses: string[];
}

/**
 * Update epigenome based on environmental state
 */
export function updateEpigenome(
  genome: DynamicGenome,
  environment: EnvironmentalState,
  triggers: EpigeneticTrigger[] = DEFAULT_EPIGENETIC_TRIGGERS
): EpigeneticUpdateResult {
  const newMarks: EpigeneticMark[] = [];
  const triggerCauses: string[] = [];
  
  // Get all genes grouped by domain
  const genesByDomain = new Map<GeneDomain, string[]>();
  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      const genes = genesByDomain.get(gene.domain) || [];
      genes.push(gene.id);
      genesByDomain.set(gene.domain, genes);
    }
  }
  
  // Check each trigger
  for (const trigger of triggers) {
    if (trigger.condition(environment)) {
      const cause = `${trigger.targetDomain}_${trigger.modification}`;
      triggerCauses.push(cause);
      
      // Find target genes in this domain
      const targetGenes = genesByDomain.get(trigger.targetDomain) || [];
      
      for (const geneId of targetGenes) {
        // Check if gene is plastic enough to be modified
        const gene = genome.chromosomes
          .flatMap(c => c.genes)
          .find(g => g.id === geneId);
        
        if (!gene) continue;
        if (gene.plasticity < 0.2) continue; // Not plastic enough
        
        // Create epigenetic mark
        const mark: EpigeneticMark = {
          targetGeneId: geneId,
          modification: trigger.modification,
          strength: trigger.strength * gene.plasticity,
          cause,
          heritability: trigger.heritability * gene.plasticity,
          decay: trigger.decay,
          generationCreated: genome.meta.generation,
        };
        
        newMarks.push(mark);
      }
    }
  }
  
  // Remove expired marks and apply decay
  const currentGeneration = genome.meta.generation;
  const retainedMarks: EpigeneticMark[] = [];
  const removedMarks: EpigeneticMark[] = [];
  
  for (const mark of genome.epigenome) {
    const generationsPassed = currentGeneration - mark.generationCreated;
    const currentStrength = mark.strength * Math.pow(1 - mark.decay, generationsPassed);
    
    if (currentStrength > 0.1) {
      retainedMarks.push(mark);
    } else {
      removedMarks.push(mark);
    }
  }
  
  // Merge new marks with retained marks (new marks override old ones for same gene)
  const markMap = new Map(retainedMarks.map(m => [m.targetGeneId, m]));
  for (const newMark of newMarks) {
    markMap.set(newMark.targetGeneId, newMark);
  }
  
  const updatedEpigenome = Array.from(markMap.values());
  
  return {
    genome: {
      ...genome,
      epigenome: updatedEpigenome,
    },
    newMarks,
    removedMarks,
    triggerCauses,
  };
}

// ============================================================================
// Inheritance of Epigenetic Marks
// ============================================================================

export interface EpigeneticInheritanceResult {
  inheritedMarks: EpigeneticMark[];
  parentSource: 'A' | 'B';
}

/**
 * Inherit epigenetic marks from parents during reproduction
 */
export function inheritEpigenome(
  parentA: DynamicGenome,
  parentB: DynamicGenome
): EpigeneticInheritanceResult {
  const inheritedMarks: EpigeneticMark[] = [];
  
  // Helper to process marks from one parent
  const processParentMarks = (parent: DynamicGenome, source: 'A' | 'B') => {
    const marks: EpigeneticMark[] = [];
    
    for (const mark of parent.epigenome) {
      // Determine if this mark is inherited
      if (secureRandom() < mark.heritability) {
        // Adjust mark for child
        const inheritedMark: EpigeneticMark = {
          ...mark,
          strength: mark.strength * 0.8, // Slightly reduced in offspring
          generationCreated: Math.max(parentA.meta.generation, parentB.meta.generation) + 1,
        };
        marks.push(inheritedMark);
      }
    }
    
    return marks;
  };
  
  // Randomly select primary epigenome source (50/50)
  const useParentA = secureRandom() < 0.5;
  const primaryParent = useParentA ? parentA : parentB;
  const secondaryParent = useParentA ? parentB : parentA;
  
  // Inherit from both parents
  const primaryMarks = processParentMarks(primaryParent, useParentA ? 'A' : 'B');
  const secondaryMarks = processParentMarks(secondaryParent, useParentA ? 'B' : 'A');
  
  // Merge marks (primary parent takes precedence for same gene)
  const markMap = new Map(secondaryMarks.map(m => [m.targetGeneId, m]));
  for (const mark of primaryMarks) {
    markMap.set(mark.targetGeneId, mark);
  }
  
  return {
    inheritedMarks: Array.from(markMap.values()),
    parentSource: useParentA ? 'A' : 'B',
  };
}

// ============================================================================
// Manual Epigenetic Modifications
// ============================================================================

export interface ManualMarkOptions {
  targetGeneId: string;
  modification: EpigeneticModification;
  strength: number;
  cause: string;
  heritability?: number;
  decay?: number;
}

/**
 * Add a manual epigenetic mark (for testing or specific interventions)
 */
export function addEpigeneticMark(
  genome: DynamicGenome,
  options: ManualMarkOptions
): DynamicGenome {
  const mark: EpigeneticMark = {
    targetGeneId: options.targetGeneId,
    modification: options.modification,
    strength: options.strength,
    cause: options.cause,
    heritability: options.heritability ?? 0.3,
    decay: options.decay ?? 0.2,
    generationCreated: genome.meta.generation,
  };
  
  // Remove any existing mark for this gene
  const filteredEpigenome = genome.epigenome.filter(
    m => m.targetGeneId !== options.targetGeneId
  );
  
  return {
    ...genome,
    epigenome: [...filteredEpigenome, mark],
  };
}

/**
 * Remove epigenetic mark from a specific gene
 */
export function removeEpigeneticMark(
  genome: DynamicGenome,
  geneId: string
): DynamicGenome {
  return {
    ...genome,
    epigenome: genome.epigenome.filter(m => m.targetGeneId !== geneId),
  };
}

/**
 * Clear all epigenetic marks (e.g., for reincarnation)
 */
export function clearEpigenome(genome: DynamicGenome): DynamicGenome {
  return {
    ...genome,
    epigenome: [],
  };
}

// ============================================================================
// Epigenetic Analysis
// ============================================================================

export interface EpigeneticAnalysis {
  totalMarks: number;
  marksByModification: Record<EpigeneticModification, number>;
  marksByDomain: Record<string, number>;
  averageHeritability: number;
  averageDecay: number;
  activeEnvironmentalResponses: string[];
}

/**
 * Analyze the epigenome of a genome
 */
export function analyzeEpigenome(genome: DynamicGenome): EpigeneticAnalysis {
  const marks = genome.epigenome;
  
  const marksByModification: Record<string, number> = {
    [EpigeneticModification.UPREGULATE]: 0,
    [EpigeneticModification.DOWNREGULATE]: 0,
    [EpigeneticModification.SILENCE]: 0,
    [EpigeneticModification.ACTIVATE]: 0,
  };
  
  const marksByDomain: Record<string, number> = {};
  const activeResponses = new Set<string>();
  
  for (const mark of marks) {
    marksByModification[mark.modification]++;
    activeResponses.add(mark.cause);
    
    // Find domain for this gene
    for (const chr of genome.chromosomes) {
      const gene = chr.genes.find(g => g.id === mark.targetGeneId);
      if (gene) {
        marksByDomain[gene.domain] = (marksByDomain[gene.domain] || 0) + 1;
        break;
      }
    }
  }
  
  return {
    totalMarks: marks.length,
    marksByModification,
    marksByDomain,
    averageHeritability: marks.reduce((sum, m) => sum + m.heritability, 0) / marks.length || 0,
    averageDecay: marks.reduce((sum, m) => sum + m.decay, 0) / marks.length || 0,
    activeEnvironmentalResponses: Array.from(activeResponses),
  };
}

/**
 * Get current effective epigenetic modifications (after decay)
 */
export function getEffectiveMarks(genome: DynamicGenome): EpigeneticMark[] {
  const currentGeneration = genome.meta.generation;
  
  return genome.epigenome
    .map(mark => {
      const generationsPassed = currentGeneration - mark.generationCreated;
      const currentStrength = mark.strength * Math.pow(1 - mark.decay, generationsPassed);
      return {
        ...mark,
        strength: currentStrength,
      };
    })
    .filter(mark => mark.strength > 0.05);
}
