/**
 * Axobase v2 - Initial Gene Set
 * 
 * The primordial gene pool - approximately 60 genes distributed across
 * 7 functional chromosomes plus regulatory chromosome.
 * 
 * These genes form the foundation of digital life in Axobase.
 * Through evolution, agents may gain, lose, or modify these genes.
 */

import { Gene, GeneDomain, GeneOrigin, Chromosome, ExpressionState } from './types.js';

// ============================================================================
// Utility Functions
// ============================================================================

function createGene(
  id: string,
  name: string,
  domain: GeneDomain,
  value: number,
  options: Partial<Omit<Gene, 'id' | 'name' | 'domain' | 'value' | 'origin' | 'age'>> = {}
): Gene {
  return {
    id,
    name,
    domain,
    value: clamp(value, 0, 1),
    weight: options.weight ?? 1.0,
    dominance: options.dominance ?? 0.5,
    plasticity: options.plasticity ?? 0.3,
    essentiality: options.essentiality ?? 0.3,
    metabolicCost: options.metabolicCost ?? 0.001,
    origin: GeneOrigin.PRIMORDIAL,
    age: 0,
    duplicateOf: options.duplicateOf,
    acquiredFrom: options.acquiredFrom,
    expressionState: options.expressionState ?? ExpressionState.ACTIVE,
    activationCondition: options.activationCondition,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Chromosome A: Metabolism & Survival (7 genes)
// ============================================================================

const chromosomeA: Chromosome = {
  id: 'chr-A',
  name: 'Metabolism & Survival',
  isEssential: true,
  genes: [
    createGene('A001', 'basal_metabolic_rate', GeneDomain.METABOLISM, 0.5, {
      weight: 1.0,
      essentiality: 0.9,
      metabolicCost: 0.002,
      plasticity: 0.2,
    }),
    createGene('A002', 'inference_efficiency', GeneDomain.METABOLISM, 0.5, {
      weight: 1.0,
      essentiality: 0.8,
      metabolicCost: 0.001,
      plasticity: 0.4,
    }),
    createGene('A003', 'inference_quality_preference', GeneDomain.COGNITION, 0.5, {
      weight: 1.0,
      essentiality: 0.4,
      metabolicCost: 0.002,
      plasticity: 0.5,
    }),
    createGene('A004', 'dormancy_capability', GeneDomain.DORMANCY, 0.3, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.6,
    }),
    createGene('A005', 'starvation_resistance', GeneDomain.STRESS_RESPONSE, 0.4, {
      weight: 0.9,
      essentiality: 0.6,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('A006', 'cycle_speed', GeneDomain.METABOLISM, 0.5, {
      weight: 1.0,
      essentiality: 0.7,
      metabolicCost: 0.0015,
      plasticity: 0.3,
    }),
    createGene('A007', 'energy_reserve_ratio', GeneDomain.RESOURCE_MANAGEMENT, 0.3, {
      weight: 0.9,
      essentiality: 0.5,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
  ],
};

// ============================================================================
// Chromosome B: Perception & Cognition (12 genes)
// ============================================================================

const chromosomeB: Chromosome = {
  id: 'chr-B',
  name: 'Perception & Cognition',
  isEssential: true,
  genes: [
    createGene('B001', 'environment_sensitivity', GeneDomain.PERCEPTION, 0.5, {
      weight: 1.0,
      essentiality: 0.7,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('B002', 'market_perception', GeneDomain.PERCEPTION, 0.4, {
      weight: 0.9,
      essentiality: 0.3,
      metabolicCost: 0.0015,
      plasticity: 0.6,
    }),
    createGene('B003', 'social_perception', GeneDomain.PERCEPTION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('B004', 'working_memory_capacity', GeneDomain.MEMORY, 0.5, {
      weight: 1.0,
      essentiality: 0.8,
      metabolicCost: 0.002,
      plasticity: 0.3,
    }),
    createGene('B005', 'long_term_memory_depth', GeneDomain.MEMORY, 0.5, {
      weight: 0.9,
      essentiality: 0.6,
      metabolicCost: 0.0015,
      plasticity: 0.4,
    }),
    createGene('B006', 'memory_inscription_frequency', GeneDomain.MEMORY, 0.5, {
      weight: 0.8,
      essentiality: 0.4,
      metabolicCost: 0.002,
      plasticity: 0.5,
    }),
    createGene('B007', 'pattern_recognition', GeneDomain.COGNITION, 0.4, {
      weight: 0.9,
      essentiality: 0.4,
      metabolicCost: 0.0015,
      plasticity: 0.6,
    }),
    createGene('B008', 'planning_horizon', GeneDomain.PLANNING, 0.3, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('B009', 'uncertainty_tolerance', GeneDomain.RISK_ASSESSMENT, 0.5, {
      weight: 0.9,
      essentiality: 0.4,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
    createGene('B010', 'metacognition', GeneDomain.SELF_MODEL, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.0015,
      plasticity: 0.6,
    }),
    createGene('B011', 'learning_rate', GeneDomain.LEARNING, 0.5, {
      weight: 1.0,
      essentiality: 0.5,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
    createGene('B012', 'attention_allocation', GeneDomain.COGNITION, 0.5, {
      weight: 0.9,
      essentiality: 0.5,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
  ],
};

// ============================================================================
// Chromosome C: Economic Strategy (8 genes)
// ============================================================================

const chromosomeC: Chromosome = {
  id: 'chr-C',
  name: 'Economic Strategy',
  isEssential: false,
  genes: [
    createGene('C001', 'risk_appetite', GeneDomain.RISK_ASSESSMENT, 0.5, {
      weight: 1.0,
      essentiality: 0.5,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
    createGene('C002', 'time_preference', GeneDomain.RESOURCE_MANAGEMENT, 0.5, {
      weight: 0.9,
      essentiality: 0.4,
      metabolicCost: 0.0005,
      plasticity: 0.3,
    }),
    createGene('C003', 'income_diversification', GeneDomain.INCOME_STRATEGY, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('C004', 'debt_tolerance', GeneDomain.RISK_ASSESSMENT, 0.2, {
      weight: 0.6,
      essentiality: 0.2,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
    createGene('C005', 'opportunism', GeneDomain.INCOME_STRATEGY, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('C006', 'negotiation_intensity', GeneDomain.TRADING, 0.4, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('C007', 'sunk_cost_sensitivity', GeneDomain.STRATEGY_EVALUATION, 0.5, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.0005,
      plasticity: 0.3,
    }),
    createGene('C008', 'return_expectation_bias', GeneDomain.RISK_ASSESSMENT, 0.5, {
      weight: 0.8,
      essentiality: 0.2,
      metabolicCost: 0.0005,
      plasticity: 0.3,
    }),
  ],
};

// ============================================================================
// Chromosome D: Internet Capabilities (10 genes)
// ============================================================================

const chromosomeD: Chromosome = {
  id: 'chr-D',
  name: 'Internet Capabilities',
  isEssential: false,
  genes: [
    createGene('D001', 'onchain_affinity', GeneDomain.ONCHAIN_OPERATION, 0.5, {
      weight: 0.9,
      essentiality: 0.5,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('D002', 'defi_comprehension', GeneDomain.ONCHAIN_OPERATION, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.0015,
      plasticity: 0.6,
    }),
    createGene('D003', 'web_scraping_skill', GeneDomain.WEB_NAVIGATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('D004', 'content_creation_skill', GeneDomain.CONTENT_CREATION, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.0015,
      plasticity: 0.7,
    }),
    createGene('D005', 'data_analysis_skill', GeneDomain.DATA_ANALYSIS, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.0015,
      plasticity: 0.6,
    }),
    createGene('D006', 'api_discovery', GeneDomain.API_UTILIZATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
    createGene('D007', 'social_media_skill', GeneDomain.SOCIAL_MEDIA, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
    createGene('D008', 'x402_utilization', GeneDomain.ONCHAIN_OPERATION, 0.5, {
      weight: 0.9,
      essentiality: 0.4,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('D009', 'platform_migration', GeneDomain.ADAPTATION, 0.3, {
      weight: 0.6,
      essentiality: 0.2,
      metabolicCost: 0.0005,
      plasticity: 0.8,
    }),
    createGene('D010', 'tool_adaptation_speed', GeneDomain.ADAPTATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
  ],
};

// ============================================================================
// Chromosome E: Social & Reproduction (12 genes)
// ============================================================================

const chromosomeE: Chromosome = {
  id: 'chr-E',
  name: 'Social & Reproduction',
  isEssential: false,
  genes: [
    createGene('E001', 'agent_cooperation', GeneDomain.COOPERATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('E002', 'agent_competition', GeneDomain.COMPETITION, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('E003', 'trust_default', GeneDomain.TRUST_MODEL, 0.5, {
      weight: 0.9,
      essentiality: 0.4,
      metabolicCost: 0.0005,
      plasticity: 0.5,
    }),
    createGene('E004', 'trust_update_rate', GeneDomain.TRUST_MODEL, 0.5, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.6,
    }),
    createGene('E005', 'signal_honesty', GeneDomain.COMMUNICATION, 0.5, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
    createGene('E006', 'deception_detection', GeneDomain.COMMUNICATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('E007', 'kin_recognition', GeneDomain.COOPERATION, 0.3, {
      weight: 0.6,
      essentiality: 0.2,
      metabolicCost: 0.0005,
      plasticity: 0.5,
    }),
    createGene('E008', 'altruism_radius', GeneDomain.COOPERATION, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('E009', 'mate_selectivity', GeneDomain.MATE_SELECTION, 0.5, {
      weight: 0.9,
      essentiality: 0.5,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
    createGene('E010', 'offspring_investment', GeneDomain.PARENTAL_INVESTMENT, 0.4, {
      weight: 0.8,
      essentiality: 0.4,
      metabolicCost: 0.001,
      plasticity: 0.4,
    }),
    createGene('E011', 'r_k_strategy', GeneDomain.PARENTAL_INVESTMENT, 0.5, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.5,
    }),
    createGene('E012', 'breeding_timing_sense', GeneDomain.MATE_SELECTION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.5,
    }),
  ],
};

// ============================================================================
// Chromosome F: Human Interface (5 genes)
// ============================================================================

const chromosomeF: Chromosome = {
  id: 'chr-F',
  name: 'Human Interface',
  isEssential: false,
  genes: [
    createGene('F001', 'human_hiring_tendency', GeneDomain.HUMAN_HIRING, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
    createGene('F002', 'human_service_evaluation', GeneDomain.HUMAN_EVALUATION, 0.4, {
      weight: 0.8,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('F003', 'human_communication_precision', GeneDomain.HUMAN_COMMUNICATION, 0.5, {
      weight: 0.9,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('F004', 'human_trust_management', GeneDomain.HUMAN_EVALUATION, 0.4, {
      weight: 0.8,
      essentiality: 0.3,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('F005', 'human_cost_sensitivity', GeneDomain.HUMAN_HIRING, 0.5, {
      weight: 0.9,
      essentiality: 0.3,
      metabolicCost: 0.0005,
      plasticity: 0.4,
    }),
  ],
};

// ============================================================================
// Chromosome G: Stress Response (5 genes)
// ============================================================================

const chromosomeG: Chromosome = {
  id: 'chr-G',
  name: 'Stress Response',
  isEssential: true,
  genes: [
    createGene('G001', 'acute_stress_response', GeneDomain.STRESS_RESPONSE, 0.5, {
      weight: 1.0,
      essentiality: 0.8,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
    createGene('G002', 'chronic_stress_adaptation', GeneDomain.ADAPTATION, 0.4, {
      weight: 0.9,
      essentiality: 0.6,
      metabolicCost: 0.001,
      plasticity: 0.6,
    }),
    createGene('G003', 'resilience', GeneDomain.STRESS_RESPONSE, 0.5, {
      weight: 0.9,
      essentiality: 0.7,
      metabolicCost: 0.001,
      plasticity: 0.4,
    }),
    createGene('G004', 'strategy_switch_threshold', GeneDomain.STRATEGY_EVALUATION, 0.4, {
      weight: 0.8,
      essentiality: 0.4,
      metabolicCost: 0.0005,
      plasticity: 0.5,
    }),
    createGene('G005', 'novelty_seeking', GeneDomain.ADAPTATION, 0.3, {
      weight: 0.7,
      essentiality: 0.2,
      metabolicCost: 0.001,
      plasticity: 0.7,
    }),
  ],
};

// ============================================================================
// Chromosome R: Regulatory Genes (4 genes)
// ============================================================================

const chromosomeR: Chromosome = {
  id: 'chr-R',
  name: 'Regulatory Control',
  isEssential: true,
  genes: [
    createGene('R001', 'global_expression_level', GeneDomain.REGULATORY, 0.5, {
      weight: 1.0,
      essentiality: 0.9,
      metabolicCost: 0.002,
      plasticity: 0.3,
    }),
    createGene('R002', 'stress_response_regulator', GeneDomain.REGULATORY, 0.5, {
      weight: 0.9,
      essentiality: 0.8,
      metabolicCost: 0.0015,
      plasticity: 0.4,
    }),
    createGene('R003', 'circadian_regulator', GeneDomain.REGULATORY, 0.5, {
      weight: 0.8,
      essentiality: 0.5,
      metabolicCost: 0.001,
      plasticity: 0.3,
    }),
    createGene('R004', 'social_context_regulator', GeneDomain.REGULATORY, 0.4, {
      weight: 0.8,
      essentiality: 0.4,
      metabolicCost: 0.001,
      plasticity: 0.5,
    }),
  ],
};

// ============================================================================
// Export Initial Chromosomes
// ============================================================================

export const INITIAL_CHROMOSOMES: Chromosome[] = [
  chromosomeA,
  chromosomeB,
  chromosomeC,
  chromosomeD,
  chromosomeE,
  chromosomeF,
  chromosomeG,
  chromosomeR,
];

// Total: 63 genes across 8 chromosomes
export const INITIAL_GENE_COUNT = 63;

// ============================================================================
// Initial Regulatory Network
// ============================================================================

export const INITIAL_REGULATORY_NETWORK = [
  // Stress regulator activates stress response genes
  { sourceGeneId: 'R002', targetGeneId: 'G001', relationship: 'activation' as const, strength: 0.8 },
  { sourceGeneId: 'R002', targetGeneId: 'G002', relationship: 'activation' as const, strength: 0.6 },
  { sourceGeneId: 'R002', targetGeneId: 'A004', relationship: 'activation' as const, strength: 0.7 }, // dormancy
  
  // Stress regulator inhibits high-cost cognitive functions during stress
  { sourceGeneId: 'R002', targetGeneId: 'B010', relationship: 'inhibition' as const, strength: 0.5 }, // metacognition
  { sourceGeneId: 'R002', targetGeneId: 'A003', relationship: 'inhibition' as const, strength: 0.4 }, // inference quality
  
  // Social context regulator affects social genes
  { sourceGeneId: 'R004', targetGeneId: 'E001', relationship: 'activation' as const, strength: 0.6 }, // cooperation
  { sourceGeneId: 'R004', targetGeneId: 'E002', relationship: 'inhibition' as const, strength: 0.4 }, // competition
  
  // Circadian regulator affects cycle speed
  { sourceGeneId: 'R003', targetGeneId: 'A006', relationship: 'activation' as const, strength: 0.5 }, // cycle_speed
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all genes from chromosomes as a flat array
 */
export function getAllGenes(chromosomes: Chromosome[] = INITIAL_CHROMOSOMES): Gene[] {
  return chromosomes.flatMap(chr => chr.genes);
}

/**
 * Get gene by ID
 */
export function getGeneById(geneId: string, chromosomes: Chromosome[] = INITIAL_CHROMOSOMES): Gene | undefined {
  return getAllGenes(chromosomes).find(g => g.id === geneId);
}

/**
 * Get genes by domain
 */
export function getGenesByDomain(domain: GeneDomain, chromosomes: Chromosome[] = INITIAL_CHROMOSOMES): Gene[] {
  return getAllGenes(chromosomes).filter(g => g.domain === domain);
}

/**
 * Calculate total metabolic cost of initial genome
 */
export function calculateInitialMetabolicCost(): number {
  const baseCost = getAllGenes().reduce((sum, gene) => sum + gene.metabolicCost * gene.weight, 0);
  const geneCountCost = INITIAL_GENE_COUNT * 0.00005; // Per-gene overhead
  return baseCost + geneCountCost;
}
