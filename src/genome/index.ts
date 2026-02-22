/**
 * Axobase v2 - Dynamic Genome Engine
 * 
 * The core evolution system for digital life.
 * 
 * This module provides:
 * - Dynamic, variable-length genome data structures
 * - 7 genetic operators (crossover, mutation, duplication, deletion, HGT, de novo, regulatory)
 * - Gene expression engine with regulatory networks
 * - Epigenetic system for environmental adaptation
 * 
 * @module genome
 */

// Types
export {
  Gene,
  Chromosome,
  DynamicGenome,
  ExpressedGene,
  ExpressedGenome,
  RegulatoryEdge,
  EpigeneticMark,
  EpigeneticModification,
  ExpressionState,
  GeneDomain,
  GeneOrigin,
  EnvironmentalState,
  GenomeStatistics,
  GeneticOperatorConfig,
  EpigeneticTrigger,
  BreedingContext,
  BreedingResult,
  MutationRecord,
  CrossoverRecord,
  SerializedGenome,
} from './types.js';

// Advanced Types
export {
  AdaptiveMutationConfig,
  PopulationMetrics,
  RegulatoryLogic,
  EnhancedRegulatoryEdge,
  DevelopmentalStage,
  DevelopmentalState,
  EpistaticInteraction,
  EpistaticRelationship,
  StructuralVariation,
  Metabolite,
  OptimizedGeneticConfig,
  CacheStats,
} from './advancedTypes.js';

// Initial Gene Set
export {
  INITIAL_CHROMOSOMES,
  INITIAL_REGULATORY_NETWORK,
  INITIAL_GENE_COUNT,
  getAllGenes,
  getGeneById,
  getGenesByDomain,
  calculateInitialMetabolicCost,
} from './initialGenes.js';

// Genetic Operators
export {
  DEFAULT_GENETIC_CONFIG,
  breed,
  createGenesisGenome,
  performHGT,
  calculateGenomeSimilarity,
} from './operators.js';

// Adaptive Mutation
export {
  DEFAULT_ADAPTIVE_CONFIG,
  detectStagnation,
  calculatePopulationDiversity,
  calculateExpressionDiversity,
  calculateAdaptiveRates,
  generateOptimizedConfig,
  applyStressMutagenesis,
  STARVATION_PROFILE,
  COMPETITION_PROFILE,
  MutationRateTracker,
  AdaptiveRates,
} from './adaptiveMutation.js';

// Expression Cache
export {
  DEFAULT_CACHE_CONFIG,
  ExpressionCache,
  getGlobalCache,
  resetGlobalCache,
  cachedExpressGenome,
  BatchExpressionCache,
} from './expressionCache.js';

// Enhanced Expression
export {
  DEFAULT_ENHANCED_CONFIG,
  expressGenomeEnhanced,
  calculateDevelopmentalStage,
  createDevelopmentalState,
  calculateEnhancedRegulatoryEffects,
  applyEpistasis,
  EnhancedExpressionResult,
  EnhancedExpressionConfig,
} from './enhancedExpression.js';

// Expression Engine
export {
  DEFAULT_EXPRESSION_CONFIG,
  expressGenome,
  getGeneExpression,
  getQuickMetabolicCost,
  canSurvive,
  getExpressedGenesByDomain,
  getTopExpressedGenes,
  ExpressionResult,
  ExpressionConfig,
} from './expression.js';

// Epigenetic System
export {
  DEFAULT_EPIGENETIC_TRIGGERS,
  updateEpigenome,
  inheritEpigenome,
  addEpigeneticMark,
  removeEpigeneticMark,
  clearEpigenome,
  analyzeEpigenome,
  getEffectiveMarks,
  EpigeneticUpdateResult,
  EpigeneticInheritanceResult,
  EpigeneticAnalysis,
  ManualMarkOptions,
} from './epigenetics.js';
