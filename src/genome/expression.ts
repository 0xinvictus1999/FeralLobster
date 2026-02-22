/**
 * Axobase v2 - Expression Engine
 * 
 * Calculates the final expression values of genes considering:
 * - Base gene value
 * - Gene weight
 * - Regulatory network effects
 * - Epigenetic modifications
 * - Conditional expression triggers
 * 
 * Also calculates total metabolic cost of the genome.
 */

import {
  DynamicGenome,
  ExpressedGenome,
  ExpressedGene,
  Chromosome,
  Gene,
  RegulatoryEdge,
  EpigeneticMark,
  ExpressionState,
  EpigeneticModification,
  EnvironmentalState,
  GenomeStatistics,
} from './types.js';

// ============================================================================
// Expression Engine Configuration
// ============================================================================

export interface ExpressionConfig {
  baseMetabolicRate: number;           // USDC per day base cost
  perGeneOverhead: number;             // USDC per day per gene
  maxRegulatoryEffect: number;         // Maximum multiplier from regulation
  minRegulatoryEffect: number;         // Minimum multiplier from regulation
  epigeneticDecayPerGeneration: number; // How fast epigenetic marks decay
}

export const DEFAULT_EXPRESSION_CONFIG: ExpressionConfig = {
  baseMetabolicRate: 0.001,
  perGeneOverhead: 0.00005,
  maxRegulatoryEffect: 2.0,
  minRegulatoryEffect: 0.1,
  epigeneticDecayPerGeneration: 0.1,
};

// ============================================================================
// Regulatory Network Calculation
// ============================================================================

/**
 * Calculate the effect of regulatory network on a specific gene
 */
function calculateRegulatoryEffect(
  geneId: string,
  expressedGenes: Map<string, ExpressedGene>,
  regulatoryNetwork: RegulatoryEdge[]
): number {
  let effect = 1.0; // Neutral baseline
  
  // Find all edges targeting this gene
  const incomingEdges = regulatoryNetwork.filter(edge => edge.targetGeneId === geneId);
  
  for (const edge of incomingEdges) {
    const sourceGene = expressedGenes.get(edge.sourceGeneId);
    if (!sourceGene) continue;
    
    // Only active genes can regulate
    if (sourceGene.expressionState !== ExpressionState.ACTIVE) continue;
    
    const sourceExpression = sourceGene.expressedValue;
    const edgeEffect = edge.strength * sourceExpression;
    
    if (edge.relationship === 'activation') {
      // Activation: multiplicative boost
      effect *= (1 + edgeEffect * 0.5);
    } else {
      // Inhibition: multiplicative reduction
      effect *= (1 - edgeEffect * 0.5);
    }
  }
  
  // Clamp to valid range
  return Math.max(0.1, Math.min(2.0, effect));
}

/**
 * Iteratively calculate regulatory effects until convergence
 */
function calculateRegulatoryNetworkEffects(
  genes: ExpressedGene[],
  regulatoryNetwork: RegulatoryEdge[]
): Map<string, number> {
  const effects = new Map<string, number>();
  const geneMap = new Map(genes.map(g => [g.id, g]));
  
  // Initialize with base effects
  for (const gene of genes) {
    effects.set(gene.id, 1.0);
  }
  
  // Iteratively propagate regulatory effects
  const maxIterations = 10;
  const convergenceThreshold = 0.001;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let maxChange = 0;
    
    for (const gene of genes) {
      const oldEffect = effects.get(gene.id) ?? 1.0;
      
      // Calculate new effect based on current network state
      const incomingEdges = regulatoryNetwork.filter(edge => edge.targetGeneId === gene.id);
      let newEffect = 1.0;
      
      for (const edge of incomingEdges) {
        const sourceGene = geneMap.get(edge.sourceGeneId);
        if (!sourceGene || sourceGene.expressionState !== ExpressionState.ACTIVE) continue;
        
        const sourceValue = sourceGene.value * sourceGene.weight * (effects.get(sourceGene.id) ?? 1.0);
        const edgeImpact = edge.strength * sourceValue;
        
        if (edge.relationship === 'activation') {
          newEffect *= (1 + edgeImpact * 0.3);
        } else {
          newEffect *= Math.max(0.1, 1 - edgeImpact * 0.3);
        }
      }
      
      // Clamp regulatory effect
      newEffect = Math.max(0.1, Math.min(2.0, newEffect));
      
      const change = Math.abs(newEffect - oldEffect);
      maxChange = Math.max(maxChange, change);
      effects.set(gene.id, newEffect);
    }
    
    // Check for convergence
    if (maxChange < convergenceThreshold) break;
  }
  
  return effects;
}

// ============================================================================
// Epigenetic Calculation
// ============================================================================

/**
 * Calculate epigenetic effect on a gene
 */
function calculateEpigeneticEffect(
  geneId: string,
  epigenome: EpigeneticMark[]
): number {
  let effect = 1.0; // Neutral baseline
  
  const relevantMarks = epigenome.filter(mark => mark.targetGeneId === geneId);
  
  for (const mark of relevantMarks) {
    const currentStrength = mark.strength * Math.pow(1 - mark.decay, mark.generationCreated);
    
    switch (mark.modification) {
      case EpigeneticModification.UPREGULATE:
        effect *= (1 + currentStrength * 0.5);
        break;
      case EpigeneticModification.DOWNREGULATE:
        effect *= (1 - currentStrength * 0.5);
        break;
      case EpigeneticModification.SILENCE:
        effect *= (1 - currentStrength);
        break;
      case EpigeneticModification.ACTIVATE:
        effect *= (1 + currentStrength);
        break;
    }
  }
  
  return Math.max(0, effect);
}

/**
 * Check if conditional expression condition is met
 */
function evaluateCondition(condition: string | undefined, environment: EnvironmentalState): boolean {
  if (!condition) return true;
  
  // Parse simple conditions
  // Format examples: "balance>10", "starving>3", "mode=emergency"
  const parts = condition.split(/([<>=]+)/);
  if (parts.length !== 3) return true;
  
  const [varName, operator, value] = parts;
  let envValue: number | string;
  
  switch (varName.trim()) {
    case 'balance':
      envValue = environment.balanceUSDC;
      break;
    case 'starving':
      envValue = environment.daysStarving;
      break;
    case 'thriving':
      envValue = environment.daysThriving;
      break;
    case 'mode':
      envValue = environment.currentMode;
      break;
    default:
      return true;
  }
  
  if (typeof envValue === 'string') {
    return envValue === value.trim();
  }
  
  const numValue = parseFloat(value);
  switch (operator) {
    case '>': return envValue > numValue;
    case '<': return envValue < numValue;
    case '>=': return envValue >= numValue;
    case '<=': return envValue <= numValue;
    case '=': return envValue === numValue;
    default: return true;
  }
}

// ============================================================================
// Metabolic Cost Calculation
// ============================================================================

/**
 * Calculate metabolic cost for a single gene
 */
function calculateGeneMetabolicCost(
  gene: ExpressedGene,
  config: ExpressionConfig
): number {
  // Base cost scaled by expression
  const expressionFactor = gene.expressedValue;
  return gene.metabolicCost * expressionFactor;
}

// ============================================================================
// Main Expression Engine
// ============================================================================

export interface ExpressionResult {
  expressedGenome: ExpressedGenome;
  statistics: GenomeStatistics;
  activeGeneCount: number;
  silencedGeneCount: number;
}

/**
 * Express a genome - calculate final gene expression values
 */
export function expressGenome(
  genome: DynamicGenome,
  environment: EnvironmentalState,
  config: ExpressionConfig = DEFAULT_EXPRESSION_CONFIG
): ExpressionResult {
  // Step 1: Create initial expressed genes with base calculations
  const allGenes: ExpressedGene[] = [];
  
  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      // Check conditional expression
      const conditionMet = evaluateCondition(gene.activationCondition, environment);
      
      let expressionState = gene.expressionState;
      if (expressionState === ExpressionState.CONDITIONAL && !conditionMet) {
        expressionState = ExpressionState.SILENCED;
      }
      
      // Initial expressed value = base value * weight
      const initialExpressedValue = gene.value * gene.weight;
      
      allGenes.push({
        ...gene,
        expressionState,
        expressedValue: initialExpressedValue,
        regulatoryEffect: 1.0,
        epigeneticEffect: 1.0,
      });
    }
  }
  
  // Step 2: Calculate regulatory network effects
  const regulatoryEffects = calculateRegulatoryNetworkEffects(allGenes, genome.regulatoryNetwork);
  
  // Step 3: Calculate epigenetic effects
  const geneMap = new Map(allGenes.map(g => [g.id, g]));
  
  for (const gene of allGenes) {
    gene.regulatoryEffect = regulatoryEffects.get(gene.id) ?? 1.0;
    gene.epigeneticEffect = calculateEpigeneticEffect(gene.id, genome.epigenome);
    
    // Final expression value
    if (gene.expressionState === ExpressionState.SILENCED) {
      gene.expressedValue = 0;
    } else {
      gene.expressedValue = 
        gene.value * 
        gene.weight * 
        gene.regulatoryEffect * 
        gene.epigeneticEffect;
      
      // Clamp to valid range
      gene.expressedValue = Math.max(0, Math.min(3.0, gene.expressedValue));
    }
  }
  
  // Step 4: Build expressed chromosomes
  const expressedChromosomes = genome.chromosomes.map(chr => ({
    id: chr.id,
    name: chr.name,
    isEssential: chr.isEssential,
    genes: chr.genes
      .map(g => geneMap.get(g.id))
      .filter((g): g is ExpressedGene => g !== undefined),
  }));
  
  // Step 5: Calculate metabolic costs
  let totalMetabolicCost = config.baseMetabolicRate;
  totalMetabolicCost += genome.meta.totalGenes * config.perGeneOverhead;
  
  for (const gene of allGenes) {
    totalMetabolicCost += calculateGeneMetabolicCost(gene, config);
  }
  
  // Step 6: Calculate statistics
  const activeGenes = allGenes.filter(g => g.expressionState === ExpressionState.ACTIVE);
  const silencedGenes = allGenes.filter(g => g.expressionState === ExpressionState.SILENCED);
  
  const domainDistribution: Record<string, number> = {};
  for (const gene of allGenes) {
    domainDistribution[gene.domain] = (domainDistribution[gene.domain] || 0) + 1;
  }
  
  const statistics: GenomeStatistics = {
    totalGenes: allGenes.length,
    totalChromosomes: genome.chromosomes.length,
    domainDistribution,
    averageMetabolicCost: totalMetabolicCost / allGenes.length,
    totalMetabolicCost,
    averagePlasticity: allGenes.reduce((sum, g) => sum + g.plasticity, 0) / allGenes.length,
    averageEssentiality: allGenes.reduce((sum, g) => sum + g.essentiality, 0) / allGenes.length,
    regulatoryEdgeCount: genome.regulatoryNetwork.length,
    epigeneticMarkCount: genome.epigenome.length,
    averageGeneAge: allGenes.reduce((sum, g) => sum + g.age, 0) / allGenes.length,
    oldestGeneAge: Math.max(...allGenes.map(g => g.age)),
    newestGeneOrigin: allGenes.sort((a, b) => b.age - a.age)[0]?.origin || 'PRIMORDIAL',
  };
  
  const expressedGenome: ExpressedGenome = {
    meta: genome.meta,
    chromosomes: expressedChromosomes,
    totalMetabolicCost,
    regulatoryNetwork: genome.regulatoryNetwork,
  };
  
  return {
    expressedGenome,
    statistics,
    activeGeneCount: activeGenes.length,
    silencedGeneCount: silencedGenes.length,
  };
}

// ============================================================================
// Quick Expression Functions
// ============================================================================

/**
 * Get a specific gene's expressed value
 */
export function getGeneExpression(
  genome: DynamicGenome,
  geneId: string,
  environment: EnvironmentalState
): number {
  const result = expressGenome(genome, environment);
  for (const chr of result.expressedGenome.chromosomes) {
    const gene = chr.genes.find(g => g.id === geneId);
    if (gene) return gene.expressedValue;
  }
  return 0;
}

/**
 * Get total metabolic cost without full expression
 */
export function getQuickMetabolicCost(
  genome: DynamicGenome,
  config: ExpressionConfig = DEFAULT_EXPRESSION_CONFIG
): number {
  const allGenes = genome.chromosomes.flatMap(c => c.genes);
  let cost = config.baseMetabolicRate;
  cost += allGenes.length * config.perGeneOverhead;
  
  for (const gene of allGenes) {
    // Approximate expression value
    const approxExpression = gene.value * gene.weight;
    cost += gene.metabolicCost * approxExpression;
  }
  
  return cost;
}

/**
 * Check if genome can survive given balance
 */
export function canSurvive(
  genome: DynamicGenome,
  balanceUSDC: number,
  daysToProject: number = 7
): boolean {
  const dailyCost = getQuickMetabolicCost(genome);
  return balanceUSDC >= dailyCost * daysToProject;
}

/**
 * Get genes by domain from expressed genome
 */
export function getExpressedGenesByDomain(
  expressedGenome: ExpressedGenome,
  domain: string
): ExpressedGene[] {
  return expressedGenome.chromosomes
    .flatMap(c => c.genes)
    .filter(g => g.domain === domain);
}

/**
 * Get top expressed genes
 */
export function getTopExpressedGenes(
  expressedGenome: ExpressedGenome,
  count: number = 10
): ExpressedGene[] {
  return expressedGenome.chromosomes
    .flatMap(c => c.genes)
    .sort((a, b) => b.expressedValue - a.expressedValue)
    .slice(0, count);
}
