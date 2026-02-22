/**
 * Axobase v2 - Genetic Operators
 * 
 * Implementation of all genetic operators for the dynamic genome:
 * - Crossover (chromosome-level and gene-level)
 * - Point Mutation
 * - Gene Duplication
 * - Gene Deletion
 * - Horizontal Gene Transfer
 * - De Novo Gene Birth
 * - Regulatory Network Recombination
 * 
 * All random numbers use crypto.getRandomValues for security.
 */

import { createHash, randomBytes } from 'crypto';
import {
  Gene,
  Chromosome,
  DynamicGenome,
  GeneOrigin,
  ExpressionState,
  GeneDomain,
  RegulatoryEdge,
  BreedingContext,
  BreedingResult,
  MutationRecord,
  CrossoverRecord,
  GeneticOperatorConfig,
} from './types.js';
import { INITIAL_REGULATORY_NETWORK } from './initialGenes.js';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_GENETIC_CONFIG: GeneticOperatorConfig = {
  // Crossover
  chromosomeLevelCrossoverRate: 0.7,
  geneLevelCrossoverRate: 0.3,
  extraGeneInheritanceRate: 0.5,
  
  // Point Mutation
  pointMutationRate: 0.05,
  pointMutationSigma: 0.08,
  largeMutationRate: 0.0025,
  weightMutationRate: 0.05,
  
  // Gene Duplication
  duplicationRate: 0.03,
  duplicationWeightFactor: 0.5,
  duplicationMutationBonus: true,
  
  // Gene Deletion
  deletionRate: 0.02,
  silencedDeletionRate: 0.08,
  lowWeightDeletionRate: 0.05,
  starvationDeletionRate: 0.15,
  
  // Horizontal Gene Transfer
  hgtRate: 0.05,
  hgtMinCooperationHours: 72,
  hgtMinInteractions: 20,
  hgtInitialWeightFactor: 0.3,
  
  // De Novo Gene Birth
  deNovoRate: 0.005,
  deNovoMinWeight: 0.1,
  deNovoMaxWeight: 0.3,
  deNovoMinEssentiality: 0.0,
  deNovoMaxEssentiality: 0.2,
  
  // Regulatory Network
  regulatoryAddEdgeRate: 0.02,
  regulatoryDeleteEdgeRate: 0.02,
  regulatoryModifyEdgeRate: 0.05,
};

// ============================================================================
// Cryptographically Secure Random Number Generation
// ============================================================================

function secureRandom(): number {
  const buf = randomBytes(4);
  return buf.readUInt32LE(0) / 0xFFFFFFFF;
}

function secureRandomRange(min: number, max: number): number {
  return min + secureRandom() * (max - min);
}

function secureGaussian(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = secureRandom();
  const u2 = secureRandom();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

function secureChoice<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(secureRandom() * array.length)];
}

function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// Gene Factory
// ============================================================================

function generateGeneId(): string {
  return `gene_${randomBytes(4).toString('hex')}_${Date.now().toString(36)}`;
}

function createDuplicatedGene(sourceGene: Gene, newGeneration: number): Gene {
  return {
    ...sourceGene,
    id: generateGeneId(),
    weight: sourceGene.weight * DEFAULT_GENETIC_CONFIG.duplicationWeightFactor,
    origin: GeneOrigin.DUPLICATED,
    age: 0,
    duplicateOf: sourceGene.id,
    acquiredFrom: undefined,
  };
}

function createDeNovoGene(generation: number): Gene {
  const domains = Object.values(GeneDomain);
  const randomDomain = secureChoice(domains) || GeneDomain.METABOLISM;
  
  return {
    id: generateGeneId(),
    name: `novo_${randomBytes(3).toString('hex')}`,
    domain: randomDomain,
    value: secureRandom(),
    weight: secureRandomRange(
      DEFAULT_GENETIC_CONFIG.deNovoMinWeight,
      DEFAULT_GENETIC_CONFIG.deNovoMaxWeight
    ),
    dominance: secureRandom() * 0.5, // Low dominance for new genes
    plasticity: secureRandomRange(0.5, 1.0), // High plasticity
    essentiality: secureRandomRange(
      DEFAULT_GENETIC_CONFIG.deNovoMinEssentiality,
      DEFAULT_GENETIC_CONFIG.deNovoMaxEssentiality
    ),
    metabolicCost: secureRandom() * 0.005, // Low initial cost
    origin: GeneOrigin.DE_NOVO,
    age: 0,
    expressionState: ExpressionState.CONDITIONAL,
    activationCondition: 'environment_trigger_unknown',
  };
}

function createHGTGene(sourceGene: Gene, fromAgentId: string): Gene {
  return {
    ...sourceGene,
    id: generateGeneId(),
    weight: sourceGene.weight * DEFAULT_GENETIC_CONFIG.hgtInitialWeightFactor,
    origin: GeneOrigin.HORIZONTAL_TRANSFER,
    age: 0,
    duplicateOf: undefined,
    acquiredFrom: fromAgentId,
  };
}

// ============================================================================
// Crossover Operator
// ============================================================================

function performCrossover(
  parentA: DynamicGenome,
  parentB: DynamicGenome,
  config: GeneticOperatorConfig
): { chromosomes: Chromosome[]; crossoverRecords: CrossoverRecord[] } {
  const chromosomes: Chromosome[] = [];
  const crossoverRecords: CrossoverRecord[] = [];
  
  // Get all unique chromosome IDs from both parents
  const chrIds = new Set([
    ...parentA.chromosomes.map(c => c.id),
    ...parentB.chromosomes.map(c => c.id),
  ]);
  
  for (const chrId of chrIds) {
    const chrA = parentA.chromosomes.find(c => c.id === chrId);
    const chrB = parentB.chromosomes.find(c => c.id === chrId);
    
    if (!chrA && !chrB) continue;
    
    // If only one parent has this chromosome, inherit with probability
    if (!chrA || !chrB) {
      const existingChr = (chrA || chrB)!;
      if (secureRandom() < 0.5) {
        chromosomes.push({
          ...existingChr,
          genes: existingChr.genes.map(g => ({ ...g, age: g.age + 1 })),
        });
        crossoverRecords.push({
          chromosomeId: chrId,
          parentSource: chrA ? 'A' : 'B',
          geneCount: existingChr.genes.length,
        });
      }
      continue;
    }
    
    // Both parents have this chromosome - perform crossover
    const useChromosomeLevel = secureRandom() < config.chromosomeLevelCrossoverRate;
    
    if (useChromosomeLevel) {
      // Whole chromosome inheritance
      const fromA = secureRandom() < 0.5;
      const sourceChr = fromA ? chrA : chrB;
      chromosomes.push({
        ...sourceChr,
        genes: sourceChr.genes.map(g => ({ ...g, age: g.age + 1 })),
      });
      crossoverRecords.push({
        chromosomeId: chrId,
        parentSource: fromA ? 'A' : 'B',
        geneCount: sourceChr.genes.length,
      });
    } else {
      // Gene-level uniform crossover
      const childGenes: Gene[] = [];
      const allGeneIds = new Set([
        ...chrA.genes.map(g => g.id),
        ...chrB.genes.map(g => g.id),
      ]);
      
      for (const geneId of allGeneIds) {
        const geneA = chrA.genes.find(g => g.id === geneId);
        const geneB = chrB.genes.find(g => g.id === geneId);
        
        if (geneA && geneB) {
          // Both have this gene - choose one
          const chosen = secureRandom() < 0.5 ? geneA : geneB;
          childGenes.push({ ...chosen, age: chosen.age + 1 });
        } else if (geneA || geneB) {
          // Only one has this gene (duplicated/acquired)
          const existing = (geneA || geneB)!;
          // Inherit with extraGeneInheritanceRate probability
          if (secureRandom() < config.extraGeneInheritanceRate) {
            childGenes.push({ ...existing, age: existing.age + 1 });
          }
        }
      }
      
      chromosomes.push({
        id: chrId,
        name: chrA.name,
        isEssential: chrA.isEssential || chrB.isEssential,
        genes: childGenes,
      });
      crossoverRecords.push({
        chromosomeId: chrId,
        parentSource: childGenes.length > 0 && chrA.genes.some(g => g.id === childGenes[0]?.id) ? 'A' : 'B',
        geneCount: childGenes.length,
      });
    }
  }
  
  return { chromosomes, crossoverRecords };
}

// ============================================================================
// Point Mutation Operator
// ============================================================================

function applyPointMutations(
  chromosomes: Chromosome[],
  config: GeneticOperatorConfig
): { chromosomes: Chromosome[]; mutations: MutationRecord[] } {
  const mutatedChromosomes: Chromosome[] = [];
  const mutations: MutationRecord[] = [];
  
  for (const chr of chromosomes) {
    const mutatedGenes: Gene[] = [];
    
    for (const gene of chr.genes) {
      let mutatedGene = { ...gene };
      
      // Large mutation (complete reset) - 0.25% probability
      if (secureRandom() < config.largeMutationRate) {
        const oldValue = mutatedGene.value;
        mutatedGene.value = secureRandom();
        mutatedGene.origin = GeneOrigin.MUTATED;
        mutations.push({
          geneId: gene.id,
          geneName: gene.name,
          type: 'large',
          before: oldValue,
          after: mutatedGene.value,
        });
      }
      // Regular point mutation - 5% probability
      else if (secureRandom() < config.pointMutationRate) {
        const oldValue = mutatedGene.value;
        const noise = secureGaussian(0, config.pointMutationSigma);
        mutatedGene.value = Math.max(0, Math.min(1, mutatedGene.value + noise));
        mutatedGene.origin = GeneOrigin.MUTATED;
        mutations.push({
          geneId: gene.id,
          geneName: gene.name,
          type: 'point',
          before: oldValue,
          after: mutatedGene.value,
        });
      }
      
      // Weight mutation
      if (secureRandom() < config.weightMutationRate) {
        const oldWeight = mutatedGene.weight;
        const noise = secureGaussian(0, 0.1);
        mutatedGene.weight = Math.max(0.1, Math.min(3.0, mutatedGene.weight + noise));
        if (!mutations.find(m => m.geneId === gene.id)) {
          mutations.push({
            geneId: gene.id,
            geneName: gene.name,
            type: 'point',
            before: oldWeight,
            after: mutatedGene.weight,
          });
        }
      }
      
      mutatedGenes.push(mutatedGene);
    }
    
    mutatedChromosomes.push({
      ...chr,
      genes: mutatedGenes,
    });
  }
  
  return { chromosomes: mutatedChromosomes, mutations };
}

// ============================================================================
// Gene Duplication Operator
// ============================================================================

function applyGeneDuplications(
  chromosomes: Chromosome[],
  config: GeneticOperatorConfig
): { chromosomes: Chromosome[]; mutations: MutationRecord[] } {
  const resultChromosomes: Chromosome[] = [];
  const mutations: MutationRecord[] = [];
  
  for (const chr of chromosomes) {
    const newGenes: Gene[] = [...chr.genes];
    
    for (const gene of chr.genes) {
      if (secureRandom() < config.duplicationRate) {
        const duplicated = createDuplicatedGene(gene, 0);
        
        // Immediate small mutation if enabled
        if (config.duplicationMutationBonus) {
          duplicated.value = Math.max(0, Math.min(1, 
            duplicated.value + secureGaussian(0, 0.05)
          ));
        }
        
        newGenes.push(duplicated);
        mutations.push({
          geneId: duplicated.id,
          geneName: duplicated.name,
          type: 'duplication',
          before: gene.id,
          after: duplicated,
        });
      }
    }
    
    resultChromosomes.push({
      ...chr,
      genes: newGenes,
    });
  }
  
  return { chromosomes: resultChromosomes, mutations };
}

// ============================================================================
// Gene Deletion Operator
// ============================================================================

function applyGeneDeletions(
  chromosomes: Chromosome[],
  config: GeneticOperatorConfig,
  starvationMode: boolean
): { chromosomes: Chromosome[]; mutations: MutationRecord[] } {
  const resultChromosomes: Chromosome[] = [];
  const mutations: MutationRecord[] = [];
  
  const deletionThreshold = starvationMode 
    ? config.starvationDeletionRate 
    : config.deletionRate;
  
  for (const chr of chromosomes) {
    const survivingGenes: Gene[] = [];
    
    for (const gene of chr.genes) {
      let shouldDelete = false;
      
      // Skip essential genes
      if (gene.essentiality > 0.8) {
        survivingGenes.push(gene);
        continue;
      }
      
      // Calculate deletion probability based on gene state
      let deletionProb = deletionThreshold * (1 - gene.essentiality);
      
      // Higher deletion chance for silenced genes
      if (gene.expressionState === 'silenced') {
        deletionProb = Math.max(deletionProb, config.silencedDeletionRate * (1 - gene.essentiality));
      }
      
      // Higher deletion chance for low-weight genes
      if (gene.weight < 0.3) {
        deletionProb = Math.max(deletionProb, config.lowWeightDeletionRate * (1 - gene.essentiality));
      }
      
      // During starvation, prioritize high-cost genes
      if (starvationMode && gene.metabolicCost > 0.005) {
        deletionProb *= 1.5;
      }
      
      if (secureRandom() < deletionProb) {
        shouldDelete = true;
        mutations.push({
          geneId: gene.id,
          geneName: gene.name,
          type: 'deletion',
          before: gene,
          after: null,
        });
      }
      
      if (!shouldDelete) {
        survivingGenes.push(gene);
      }
    }
    
    resultChromosomes.push({
      ...chr,
      genes: survivingGenes,
    });
  }
  
  return { chromosomes: resultChromosomes, mutations };
}

// ============================================================================
// De Novo Gene Birth Operator
// ============================================================================

function applyDeNovoGenes(
  chromosomes: Chromosome[],
  config: GeneticOperatorConfig
): { chromosomes: Chromosome[]; mutations: MutationRecord[] } {
  if (secureRandom() >= config.deNovoRate) {
    return { chromosomes, mutations: [] };
  }
  
  const resultChromosomes = [...chromosomes];
  const newGene = createDeNovoGene(0);
  
  // Add to a non-essential chromosome, or create a new one
  const nonEssentialChrs = resultChromosomes.filter(c => !c.isEssential);
  
  if (nonEssentialChrs.length > 0) {
    const targetChr = secureChoice(nonEssentialChrs)!;
    targetChr.genes.push(newGene);
  } else {
    // Create a new accessory chromosome
    resultChromosomes.push({
      id: `chr-novo-${randomBytes(2).toString('hex')}`,
      name: 'Accessory',
      isEssential: false,
      genes: [newGene],
    });
  }
  
  return {
    chromosomes: resultChromosomes,
    mutations: [{
      geneId: newGene.id,
      geneName: newGene.name,
      type: 'de_novo',
      before: null,
      after: newGene,
    }],
  };
}

// ============================================================================
// Regulatory Network Recombination
// ============================================================================

function recombineRegulatoryNetwork(
  parentA: DynamicGenome,
  parentB: DynamicGenome,
  childChromosomes: Chromosome[],
  config: GeneticOperatorConfig
): { network: RegulatoryEdge[]; mutations: MutationRecord[] } {
  const mutations: MutationRecord[] = [];
  
  // Start with union of parent networks
  const edgeMap = new Map<string, RegulatoryEdge>();
  
  for (const edge of [...parentA.regulatoryNetwork, ...parentB.regulatoryNetwork]) {
    const key = `${edge.sourceGeneId}->${edge.targetGeneId}`;
    if (!edgeMap.has(key) || secureRandom() < 0.5) {
      edgeMap.set(key, { ...edge });
    }
  }
  
  // Add new edges
  if (secureRandom() < config.regulatoryAddEdgeRate) {
    const allGenes = childChromosomes.flatMap(c => c.genes);
    if (allGenes.length >= 2) {
      const source = secureChoice(allGenes)!;
      const target = secureChoice(allGenes.filter(g => g.id !== source.id))!;
      const key = `${source.id}->${target.id}`;
      
      if (!edgeMap.has(key)) {
        const newEdge: RegulatoryEdge = {
          sourceGeneId: source.id,
          targetGeneId: target.id,
          relationship: secureRandom() < 0.5 ? 'activation' : 'inhibition',
          strength: secureRandom(),
        };
        edgeMap.set(key, newEdge);
        mutations.push({
          geneId: 'network',
          geneName: 'regulatory_network',
          type: 'regulatory',
          before: null,
          after: newEdge,
        });
      }
    }
  }
  
  // Delete edges
  if (secureRandom() < config.regulatoryDeleteEdgeRate) {
    const edges = Array.from(edgeMap.values());
    if (edges.length > 0) {
      const toDelete = secureChoice(edges)!;
      const key = `${toDelete.sourceGeneId}->${toDelete.targetGeneId}`;
      edgeMap.delete(key);
      mutations.push({
        geneId: 'network',
        geneName: 'regulatory_network',
        type: 'regulatory',
        before: toDelete,
        after: null,
      });
    }
  }
  
  // Modify edge strengths
  for (const edge of edgeMap.values()) {
    if (secureRandom() < config.regulatoryModifyEdgeRate) {
      const oldStrength = edge.strength;
      edge.strength = Math.max(0, Math.min(1, 
        edge.strength + secureGaussian(0, 0.1)
      ));
      if (!mutations.find(m => m.type === 'regulatory' && m.before === null)) {
        mutations.push({
          geneId: `${edge.sourceGeneId}->${edge.targetGeneId}`,
          geneName: 'regulatory_edge',
          type: 'regulatory',
          before: oldStrength,
          after: edge.strength,
        });
      }
    }
  }
  
  return { network: Array.from(edgeMap.values()), mutations };
}

// ============================================================================
// Horizontal Gene Transfer (HGT)
// ============================================================================

export function performHGT(
  recipient: DynamicGenome,
  donor: DynamicGenome,
  donorId: string,
  cooperationHours: number,
  interactionCount: number,
  config: GeneticOperatorConfig = DEFAULT_GENETIC_CONFIG
): { genome: DynamicGenome; transferred: Gene | null } {
  // Check HGT eligibility
  if (cooperationHours < config.hgtMinCooperationHours) {
    return { genome: recipient, transferred: null };
  }
  if (interactionCount < config.hgtMinInteractions) {
    return { genome: recipient, transferred: null };
  }
  if (secureRandom() >= config.hgtRate) {
    return { genome: recipient, transferred: null };
  }
  
  // Find highly expressed genes in donor
  const donorGenes = donor.chromosomes.flatMap(c => c.genes);
  const highlyExpressed = donorGenes.filter(g => 
    g.weight > 1.0 && g.expressionState === ExpressionState.ACTIVE
  );
  
  if (highlyExpressed.length === 0) {
    return { genome: recipient, transferred: null };
  }
  
  // Select gene to transfer
  const geneToTransfer = secureChoice(highlyExpressed)!;
  const transferredGene = createHGTGene(geneToTransfer, donorId);
  
  // Add to recipient's genome
  const resultChromosomes = [...recipient.chromosomes];
  const targetChr = secureChoice(resultChromosomes);
  
  if (targetChr) {
    targetChr.genes.push(transferredGene);
  }
  
  return {
    genome: {
      ...recipient,
      chromosomes: resultChromosomes,
    },
    transferred: transferredGene,
  };
}

// ============================================================================
// Main Breeding Pipeline
// ============================================================================

export function breed(
  context: BreedingContext,
  config: GeneticOperatorConfig = DEFAULT_GENETIC_CONFIG
): BreedingResult {
  const allMutations: MutationRecord[] = [];
  
  // Step 1: Crossover
  const { chromosomes: crossedChromosomes, crossoverRecords } = performCrossover(
    context.parentA,
    context.parentB,
    config
  );
  
  // Step 2: Point Mutations
  const { chromosomes: mutatedChromosomes, mutations: pointMutations } = applyPointMutations(
    crossedChromosomes,
    config
  );
  allMutations.push(...pointMutations);
  
  // Step 3: Gene Duplications
  const { chromosomes: duplicatedChromosomes, mutations: dupMutations } = applyGeneDuplications(
    mutatedChromosomes,
    config
  );
  allMutations.push(...dupMutations);
  
  // Step 4: Gene Deletions
  const { chromosomes: prunedChromosomes, mutations: delMutations } = applyGeneDeletions(
    duplicatedChromosomes,
    config,
    context.starvationMode
  );
  allMutations.push(...delMutations);
  
  // Step 5: De Novo Genes
  const { chromosomes: finalChromosomes, mutations: novoMutations } = applyDeNovoGenes(
    prunedChromosomes,
    config
  );
  allMutations.push(...novoMutations);
  
  // Step 6: Regulatory Network Recombination
  const { network: finalNetwork, mutations: regMutations } = recombineRegulatoryNetwork(
    context.parentA,
    context.parentB,
    finalChromosomes,
    config
  );
  allMutations.push(...regMutations);
  
  // Calculate new generation number
  const newGeneration = Math.max(
    context.parentA.meta.generation,
    context.parentB.meta.generation
  ) + 1;
  
  // Calculate total gene count
  const totalGenes = finalChromosomes.reduce((sum, chr) => sum + chr.genes.length, 0);
  
  // Generate new genome hash
  const genomeData = JSON.stringify({
    chromosomes: finalChromosomes.map(c => c.genes.map(g => g.id)),
    network: finalNetwork.map(e => `${e.sourceGeneId}->${e.targetGeneId}`),
  });
  const genomeHash = createHash('sha256').update(genomeData).digest('hex');
  
  // Create child genome
  const childGenome: DynamicGenome = {
    meta: {
      generation: newGeneration,
      lineageId: context.parentA.meta.lineageId, // Inherit from parent A's lineage
      genomeHash,
      totalGenes,
      birthTimestamp: Date.now(),
    },
    chromosomes: finalChromosomes,
    regulatoryNetwork: finalNetwork,
    epigenome: [], // Epigenetic marks inherited separately
  };
  
  return {
    childGenome,
    mutations: allMutations,
    crossoverEvents: crossoverRecords,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createGenesisGenome(
  lineageId: string,
  initialChromosomes: Chromosome[]
): DynamicGenome {
  const chromosomes = initialChromosomes.map(chr => ({
    ...chr,
    genes: chr.genes.map(g => ({ ...g, age: 0 })),
  }));
  
  const totalGenes = chromosomes.reduce((sum, chr) => sum + chr.genes.length, 0);
  
  const genomeData = JSON.stringify({
    chromosomes: chromosomes.map(c => c.genes.map(g => g.id)),
    network: INITIAL_REGULATORY_NETWORK.map(e => `${e.sourceGeneId}->${e.targetGeneId}`),
  });
  const genomeHash = createHash('sha256').update(genomeData).digest('hex');
  
  return {
    meta: {
      generation: 0,
      lineageId,
      genomeHash,
      totalGenes,
      birthTimestamp: Date.now(),
    },
    chromosomes,
    regulatoryNetwork: [...INITIAL_REGULATORY_NETWORK],
    epigenome: [],
  };
}

export function calculateGenomeSimilarity(genomeA: DynamicGenome, genomeB: DynamicGenome): number {
  const genesA = new Set(genomeA.chromosomes.flatMap(c => c.genes.map(g => g.id)));
  const genesB = new Set(genomeB.chromosomes.flatMap(c => c.genes.map(g => g.id)));
  
  const intersection = new Set([...genesA].filter(x => genesB.has(x)));
  const union = new Set([...genesA, ...genesB]);
  
  return intersection.size / union.size; // Jaccard similarity
}
}

// ============================================================================
// Structural Variation (New in v2.1)
// ============================================================================

export interface StructuralVariationResult {
  chromosomes: Chromosome[];
  variations: Array<{
    type: 'inversion' | 'translocation';
    chromosomeId: string;
    startIndex: number;
    endIndex: number;
    targetChromosome?: string;
  }>;
}

/**
 * Chromosomal Inversion: Reverses a segment of genes
 * Changes gene order and potentially regulatory relationships
 */
export function applyChromosomalInversion(
  chromosomes: Chromosome[],
  inversionRate: number = 0.005
): StructuralVariationResult {
  const resultChromosomes: Chromosome[] = [];
  const variations: StructuralVariationResult['variations'] = [];

  for (const chr of chromosomes) {
    if (chr.isEssential && secureRandom() < 0.5) {
      // 50% chance to skip essential chromosomes
      resultChromosomes.push(chr);
      continue;
    }

    if (secureRandom() >= inversionRate || chr.genes.length < 3) {
      resultChromosomes.push(chr);
      continue;
    }

    // Select inversion segment
    const startIndex = Math.floor(secureRandom() * (chr.genes.length - 2));
    const maxEnd = Math.min(chr.genes.length, startIndex + Math.floor(secureRandom() * 5) + 2);
    const endIndex = Math.floor(secureRandom() * (maxEnd - startIndex - 1)) + startIndex + 1;

    // Create inverted gene array
    const beforeSegment = chr.genes.slice(0, startIndex);
    const invertedSegment = chr.genes.slice(startIndex, endIndex).reverse();
    const afterSegment = chr.genes.slice(endIndex);

    resultChromosomes.push({
      ...chr,
      genes: [...beforeSegment, ...invertedSegment, ...afterSegment],
    });

    variations.push({
      type: 'inversion',
      chromosomeId: chr.id,
      startIndex,
      endIndex,
    });
  }

  return { chromosomes: resultChromosomes, variations };
}

/**
 * Chromosomal Translocation: Swaps segments between chromosomes
 * Rare but can create novel gene combinations
 */
export function applyChromosomalTranslocation(
  chromosomes: Chromosome[],
  translocationRate: number = 0.002
): StructuralVariationResult {
  if (chromosomes.length < 2 || secureRandom() >= translocationRate) {
    return { chromosomes, variations: [] };
  }

  // Select two different non-essential chromosomes
  const nonEssential = chromosomes.filter(c => !c.isEssential && c.genes.length >= 2);
  if (nonEssential.length < 2) {
    return { chromosomes, variations: [] };
  }

  const shuffled = [...nonEssential].sort(() => secureRandom() - 0.5);
  const chrA = shuffled[0];
  const chrB = shuffled[1];

  // Select breakpoints
  const breakA = Math.floor(secureRandom() * (chrA.genes.length - 1)) + 1;
  const breakB = Math.floor(secureRandom() * (chrB.genes.length - 1)) + 1;

  // Swap segments
  const chrA_1 = chrA.genes.slice(0, breakA);
  const chrA_2 = chrA.genes.slice(breakA);
  const chrB_1 = chrB.genes.slice(0, breakB);
  const chrB_2 = chrB.genes.slice(breakB);

  // Build result
  const resultChromosomes = chromosomes.map(chr => {
    if (chr.id === chrA.id) {
      return { ...chr, genes: [...chrA_1, ...chrB_2] };
    }
    if (chr.id === chrB.id) {
      return { ...chr, genes: [...chrB_1, ...chrA_2] };
    }
    return chr;
  });

  return {
    chromosomes: resultChromosomes,
    variations: [{
      type: 'translocation',
      chromosomeId: chrA.id,
      startIndex: breakA,
      endIndex: chrA.genes.length,
      targetChromosome: chrB.id,
    }],
  };
}

// ============================================================================
// Gene Conversion (New in v2.1)
// ============================================================================

export interface GeneConversionResult {
  chromosomes: Chromosome[];
  conversions: Array<{
    donorGeneId: string;
    recipientGeneId: string;
    convertedProperties: string[];
  }>;
}

/**
 * Gene Conversion: One gene overwrites another similar gene
 * Models non-reciprocal transfer during recombination
 */
export function applyGeneConversion(
  chromosomes: Chromosome[],
  conversionRate: number = 0.002
): GeneConversionResult {
  const resultChromosomes = chromosomes.map(chr => ({ ...chr, genes: [...chr.genes] }));
  const conversions: GeneConversionResult['conversions'] = [];

  // Find similar gene pairs within each chromosome
  for (const chr of resultChromosomes) {
    for (let i = 0; i < chr.genes.length; i++) {
      for (let j = i + 1; j < chr.genes.length; j++) {
        if (secureRandom() >= conversionRate) continue;

        const geneA = chr.genes[i];
        const geneB = chr.genes[j];

        // Check similarity (same domain or similar name)
        const similar = geneA.domain === geneB.domain || 
                       geneA.name.split('_')[0] === geneB.name.split('_')[0];

        if (!similar) continue;

        // Determine donor (higher expression) and recipient
        const fitnessA = geneA.value * geneA.weight;
        const fitnessB = geneB.value * geneB.weight;

        let donor: Gene, recipient: Gene;
        if (fitnessA > fitnessB) {
          donor = geneA;
          recipient = geneB;
        } else {
          donor = geneB;
          recipient = geneA;
        }

        // Apply conversion (partial overwrite)
        const conversionRatio = 0.7; // 70% donor, 30% recipient
        const convertedProperties: string[] = [];

        if (secureRandom() < 0.5) {
          recipient.value = donor.value * conversionRatio + recipient.value * (1 - conversionRatio);
          convertedProperties.push('value');
        }
        if (secureRandom() < 0.5) {
          recipient.weight = donor.weight * conversionRatio + recipient.weight * (1 - conversionRatio);
          convertedProperties.push('weight');
        }

        if (convertedProperties.length > 0) {
          conversions.push({
            donorGeneId: donor.id,
            recipientGeneId: recipient.id,
            convertedProperties,
          });
        }
      }
    }
  }

  return { chromosomes: resultChromosomes, conversions };
}

// ============================================================================
// Enhanced Breeding with New Operators
// ============================================================================

export interface EnhancedBreedingOptions {
  enableStructuralVariation: boolean;
  enableGeneConversion: boolean;
  inversionRate: number;
  translocationRate: number;
  conversionRate: number;
}

export const DEFAULT_ENHANCED_OPTIONS: EnhancedBreedingOptions = {
  enableStructuralVariation: true,
  enableGeneConversion: true,
  inversionRate: 0.005,
  translocationRate: 0.002,
  conversionRate: 0.002,
};

export function breedEnhanced(
  context: BreedingContext,
  config: GeneticOperatorConfig = DEFAULT_GENETIC_CONFIG,
  options: EnhancedBreedingOptions = DEFAULT_ENHANCED_OPTIONS
): BreedingResult & { structuralVariations?: any[]; geneConversions?: any[] } {
  // Perform standard breeding
  const result = breed(context, config);
  
  let chromosomes = result.childGenome.chromosomes;
  const structuralVariations: any[] = [];
  const geneConversions: any[] = [];

  // Apply structural variations
  if (options.enableStructuralVariation) {
    // Inversion
    const inversionResult = applyChromosomalInversion(
      chromosomes,
      options.inversionRate
    );
    chromosomes = inversionResult.chromosomes;
    structuralVariations.push(...inversionResult.variations);

    // Translocation
    const translocationResult = applyChromosomalTranslocation(
      chromosomes,
      options.translocationRate
    );
    chromosomes = translocationResult.chromosomes;
    structuralVariations.push(...translocationResult.variations);
  }

  // Apply gene conversion
  if (options.enableGeneConversion) {
    const conversionResult = applyGeneConversion(
      chromosomes,
      options.conversionRate
    );
    chromosomes = conversionResult.chromosomes;
    geneConversions.push(...conversionResult.conversions);
  }

  // Update result
  result.childGenome.chromosomes = chromosomes;

  return {
    ...result,
    structuralVariations: structuralVariations.length > 0 ? structuralVariations : undefined,
    geneConversions: geneConversions.length > 0 ? geneConversions : undefined,
  };
}

export function calculateGenomeSimilarity(genomeA: DynamicGenome, genomeB: DynamicGenome): number {
  const genesA = new Set(genomeA.chromosomes.flatMap(c => c.genes.map(g => g.id)));
  const genesB = new Set(genomeB.chromosomes.flatMap(c => c.genes.map(g => g.id)));
  
  const intersection = new Set([...genesA].filter(x => genesB.has(x)));
  const union = new Set([...genesA, ...genesB]);
  
  return intersection.size / union.size; // Jaccard similarity
}
