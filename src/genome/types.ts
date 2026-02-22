/**
 * Axobase v2 - Dynamic Genome System
 * 
 * Core type definitions for the dynamic, variable-length genome engine.
 * This is the foundation of digital life evolution in Axobase.
 */

import { UUID } from '../types/index.js';

// ============================================================================
// Gene Domain Enumeration
// ============================================================================

export enum GeneDomain {
  // Metabolism & Basic Functions
  METABOLISM = 'METABOLISM',
  PERCEPTION = 'PERCEPTION',
  COGNITION = 'COGNITION',
  MEMORY = 'MEMORY',
  
  // Economic & Resource Management
  RESOURCE_MANAGEMENT = 'RESOURCE_MANAGEMENT',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  TRADING = 'TRADING',
  INCOME_STRATEGY = 'INCOME_STRATEGY',
  
  // Internet & Tool Capabilities
  ONCHAIN_OPERATION = 'ONCHAIN_OPERATION',
  WEB_NAVIGATION = 'WEB_NAVIGATION',
  CONTENT_CREATION = 'CONTENT_CREATION',
  DATA_ANALYSIS = 'DATA_ANALYSIS',
  API_UTILIZATION = 'API_UTILIZATION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  
  // Social & Reproduction
  COOPERATION = 'COOPERATION',
  COMPETITION = 'COMPETITION',
  COMMUNICATION = 'COMMUNICATION',
  TRUST_MODEL = 'TRUST_MODEL',
  MATE_SELECTION = 'MATE_SELECTION',
  PARENTAL_INVESTMENT = 'PARENTAL_INVESTMENT',
  
  // Human Interface
  HUMAN_HIRING = 'HUMAN_HIRING',
  HUMAN_COMMUNICATION = 'HUMAN_COMMUNICATION',
  HUMAN_EVALUATION = 'HUMAN_EVALUATION',
  
  // Stress & Adaptation
  STRESS_RESPONSE = 'STRESS_RESPONSE',
  ADAPTATION = 'ADAPTATION',
  DORMANCY = 'DORMANCY',
  MIGRATION = 'MIGRATION',
  
  // Self & Strategy
  SELF_MODEL = 'SELF_MODEL',
  STRATEGY_EVALUATION = 'STRATEGY_EVALUATION',
  LEARNING = 'LEARNING',
  PLANNING = 'PLANNING',
  
  // Regulatory
  REGULATORY = 'REGULATORY',
}

// ============================================================================
// Gene Origin Types
// ============================================================================

export enum GeneOrigin {
  PRIMORDIAL = 'PRIMORDIAL',           // From initial gene set
  INHERITED = 'INHERITED',             // Inherited from parent
  DUPLICATED = 'DUPLICATED',           // Result of gene duplication
  MUTATED = 'MUTATED',                 // Result of point mutation
  HORIZONTAL_TRANSFER = 'HORIZONTAL_TRANSFER', // From another agent
  DE_NOVO = 'DE_NOVO',                 // Spontaneously generated
}

// ============================================================================
// Expression States
// ============================================================================

export enum ExpressionState {
  ACTIVE = 'active',
  SILENCED = 'silenced',
  CONDITIONAL = 'conditional',
}

// ============================================================================
// Core Gene Interface
// ============================================================================

export interface Gene {
  id: string;                           // Global unique identifier
  name: string;                         // Human-readable name
  domain: GeneDomain;                   // Functional domain
  value: number;                        // [0, 1] Base value
  weight: number;                       // [0.1, 3.0] Expression intensity
  dominance: number;                    // [0, 1] Dominance level
  plasticity: number;                   // [0, 1] Epigenetic sensitivity
  essentiality: number;                 // [0, 1] Essentiality (higher = harder to delete)
  metabolicCost: number;                // [0, 0.01] USDC/day maintenance cost
  origin: GeneOrigin;                   // Origin of this gene
  age: number;                          // Generations this gene has existed
  duplicateOf?: string;                 // If duplicated, source gene ID
  acquiredFrom?: string;                // If HGT, source agent ID
  expressionState: ExpressionState;     // Current expression state
  activationCondition?: string;         // Condition for conditional expression
}

// ============================================================================
// Chromosome Interface
// ============================================================================

export interface Chromosome {
  id: string;                           // Chromosome identifier
  name: string;                         // Human-readable name
  genes: Gene[];                        // Ordered gene list (variable length)
  isEssential: boolean;                 // Cannot be entirely deleted
}

// ============================================================================
// Regulatory Network
// ============================================================================

export interface RegulatoryEdge {
  sourceGeneId: string;                 // Regulator gene
  targetGeneId: string;                 // Regulated gene
  relationship: 'activation' | 'inhibition';
  strength: number;                     // [0, 1] Regulatory strength
}

// ============================================================================
// Epigenetic System
// ============================================================================

export enum EpigeneticModification {
  UPREGULATE = 'upregulate',
  DOWNREGULATE = 'downregulate',
  SILENCE = 'silence',
  ACTIVATE = 'activate',
}

export interface EpigeneticMark {
  targetGeneId: string;                 // Affected gene
  modification: EpigeneticModification;
  strength: number;                     // [0, 1] Modification strength
  cause: string;                        // Environmental trigger cause
  heritability: number;                 // [0, 1] Probability of inheritance
  decay: number;                        // [0, 1] Decay rate per generation
  generationCreated: number;            // When this mark was created
}

// ============================================================================
// Dynamic Genome (Top-level)
// ============================================================================

export interface DynamicGenome {
  meta: {
    generation: number;                 // Generation count
    lineageId: string;                  // Unique lineage identifier
    genomeHash: string;                 // Hash of complete genome (for chain)
    totalGenes: number;                 // Total gene count
    birthTimestamp: number;             // Unix timestamp
  };
  chromosomes: Chromosome[];            // Multiple chromosomes
  regulatoryNetwork: RegulatoryEdge[];  // Gene regulatory relationships
  epigenome: EpigeneticMark[];          // Epigenetic marks
}

// ============================================================================
// Expressed Genome (Runtime)
// ============================================================================

export interface ExpressedGene extends Gene {
  expressedValue: number;               // Final expression value after all modifiers
  regulatoryEffect: number;             // Effect from regulatory network
  epigeneticEffect: number;             // Effect from epigenome
}

export interface ExpressedGenome {
  meta: DynamicGenome['meta'];
  chromosomes: Array<{
    id: string;
    name: string;
    genes: ExpressedGene[];
    isEssential: boolean;
  }>;
  totalMetabolicCost: number;           // Total USDC/day cost
  regulatoryNetwork: RegulatoryEdge[];
}

// ============================================================================
// Genetic Operators Configuration
// ============================================================================

export interface GeneticOperatorConfig {
  // Crossover
  chromosomeLevelCrossoverRate: number; // 0.7 - Whole chromosome inheritance
  geneLevelCrossoverRate: number;       // 0.3 - Uniform crossover
  extraGeneInheritanceRate: number;     // 0.5 - Inherit duplicated/acquired genes
  
  // Point Mutation
  pointMutationRate: number;            // 0.05 - Per gene
  pointMutationSigma: number;           // 0.08 - Gaussian noise std dev
  largeMutationRate: number;            // 0.0025 - Complete reset probability
  weightMutationRate: number;           // 0.05 - Weight mutation probability
  
  // Gene Duplication
  duplicationRate: number;              // 0.03 - Per gene per reproduction
  duplicationWeightFactor: number;      // 0.5 - New copy weight = original * this
  duplicationMutationBonus: boolean;    // true - Immediate small mutation
  
  // Gene Deletion
  deletionRate: number;                 // 0.02 - Per non-essential gene
  silencedDeletionRate: number;         // 0.08 - Long-silenced genes
  lowWeightDeletionRate: number;        // 0.05 - Low weight genes
  starvationDeletionRate: number;       // 0.15 - During starvation
  
  // Horizontal Gene Transfer
  hgtRate: number;                      // 0.05 - Per day of cooperation
  hgtMinCooperationHours: number;       // 72 - Minimum cooperation time
  hgtMinInteractions: number;           // 20 - Minimum interaction count
  hgtInitialWeightFactor: number;       // 0.3 - Transferred gene initial weight
  
  // De Novo Gene Birth
  deNovoRate: number;                   // 0.005 - Per reproduction
  deNovoMinWeight: number;              // 0.1 - Initial weight range min
  deNovoMaxWeight: number;              // 0.3 - Initial weight range max
  deNovoMinEssentiality: number;        // 0.0 - Initial essentiality range min
  deNovoMaxEssentiality: number;        // 0.2 - Initial essentiality range max
  
  // Regulatory Network
  regulatoryAddEdgeRate: number;        // 0.02 - Add edge per reproduction
  regulatoryDeleteEdgeRate: number;     // 0.02 - Delete edge per reproduction
  regulatoryModifyEdgeRate: number;     // 0.05 - Modify edge strength
}

// ============================================================================
// Epigenetic Triggers
// ============================================================================

export interface EpigeneticTrigger {
  condition: (environment: EnvironmentalState) => boolean;
  targetDomain: GeneDomain;
  modification: EpigeneticModification;
  strength: number;
  heritability: number;
  decay: number;
}

export interface EnvironmentalState {
  balanceUSDC: number;
  daysSinceLastIncome: number;
  daysStarving: number;
  daysThriving: number;
  recentDeceptions: number;
  cooperationCount: number;
  stressLevel: number;
  currentMode: 'normal' | 'low_power' | 'emergency' | 'dormant';
}

// ============================================================================
// Genome Statistics
// ============================================================================

export interface GenomeStatistics {
  totalGenes: number;
  totalChromosomes: number;
  domainDistribution: Record<GeneDomain, number>;
  averageMetabolicCost: number;
  totalMetabolicCost: number;
  averagePlasticity: number;
  averageEssentiality: number;
  regulatoryEdgeCount: number;
  epigeneticMarkCount: number;
  averageGeneAge: number;
  oldestGeneAge: number;
  newestGeneOrigin: GeneOrigin;
}

// ============================================================================
// Breeding Context
// ============================================================================

export interface BreedingContext {
  parentA: DynamicGenome;
  parentB: DynamicGenome;
  parentAId: string;
  parentBId: string;
  environmentalStress: number;          // 0-1, affects mutation rates
  starvationMode: boolean;              // Trigger emergency deletion
}

export interface BreedingResult {
  childGenome: DynamicGenome;
  mutations: MutationRecord[];
  crossoverEvents: CrossoverRecord[];
}

export interface MutationRecord {
  geneId: string;
  geneName: string;
  type: 'point' | 'large' | 'duplication' | 'deletion' | 'de_novo' | 'regulatory';
  before: unknown;
  after: unknown;
}

export interface CrossoverRecord {
  chromosomeId: string;
  parentSource: 'A' | 'B';
  geneCount: number;
}

// ============================================================================
// Genome Serialization
// ============================================================================

export interface SerializedGenome {
  version: '2.0';
  genome: DynamicGenome;
  checksum: string;
  arweaveTxId?: string;
}
