/**
 * Axobase v2 - Adaptive Mutation
 * 
 * Implements adaptive mutation rates based on:
 * - Population genetic diversity
 * - Fitness stagnation detection
 * - Environmental stress levels
 * 
 * Based on "The evolution of mutation rates" (Lynch 2010, 2011)
 */

import { randomBytes } from 'crypto';
import { 
  AdaptiveMutationConfig, 
  PopulationMetrics,
  OptimizedGeneticConfig 
} from './advancedTypes.js';

// ============================================================================
// Default Adaptive Configuration
// ============================================================================

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveMutationConfig = {
  baseRate: 0.03,                  // 降低基础突变率
  diversityThreshold: 0.25,        // 多样性低于25%时增加突变
  stagnationThreshold: 5,          // 5代停滞触发突变增加
  stressMultiplier: 3.0,           // 压力下突变率×3
  maxRate: 0.30,                   // 最高30%
  minRate: 0.005,                  // 最低0.5%
};

// ============================================================================
// Secure Random (Reused)
// ============================================================================

function secureRandom(): number {
  const buf = randomBytes(4);
  return buf.readUInt32LE(0) / 0xFFFFFFFF;
}

// ============================================================================
// Fitness Stagnation Detection
// ============================================================================

/**
 * Detect if population fitness has stagnated
 * Uses coefficient of variation and trend analysis
 */
export function detectStagnation(
  fitnessHistory: number[],
  threshold: number = 5
): { isStagnant: boolean; stagnationFactor: number } {
  if (fitnessHistory.length < threshold) {
    return { isStagnant: false, stagnationFactor: 0 };
  }

  const recent = fitnessHistory.slice(-threshold);
  
  // 计算变异系数 (CV)
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recent.length;
  const cv = Math.sqrt(variance) / (mean + 1e-10);
  
  // 线性回归斜率
  const n = recent.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = recent.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * recent[i], 0);
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX + 1e-10);
  
  // 停滞条件：低变异且低增长
  const isStagnant = cv < 0.05 && slope < 0.01;
  
  // 停滞因子 (0-1)
  const stagnationFactor = isStagnant 
    ? Math.min(1, (0.05 - cv) / 0.05) * Math.min(1, (0.01 - slope) / 0.01)
    : 0;
  
  return { isStagnant, stagnationFactor };
}

// ============================================================================
// Diversity Calculation
// ============================================================================

/**
 * Calculate population genetic diversity using expected heterozygosity
 * 
 * @param genomeHashes Array of genome hashes or representative vectors
 */
export function calculatePopulationDiversity(genomeHashes: string[]): number {
  if (genomeHashes.length < 2) return 0;
  
  // 使用 pairwise difference
  let totalDistance = 0;
  let comparisons = 0;
  
  for (let i = 0; i < genomeHashes.length; i++) {
    for (let j = i + 1; j < genomeHashes.length; j++) {
      totalDistance += calculateHammingDistance(genomeHashes[i], genomeHashes[j]);
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalDistance / comparisons : 0;
}

function calculateHammingDistance(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) diff++;
  }
  diff += Math.abs(a.length - b.length);
  return diff / Math.max(a.length, b.length);
}

/**
 * 基于表达基因组的多样性计算
 */
export function calculateExpressionDiversity(
  geneExpressionVectors: Map<string, number>[]
): number {
  if (geneExpressionVectors.length < 2) return 0;
  
  let totalVariance = 0;
  const geneIds = Array.from(geneExpressionVectors[0].keys());
  
  for (const geneId of geneIds) {
    const values = geneExpressionVectors.map(v => v.get(geneId) || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    totalVariance += variance;
  }
  
  return Math.min(1, totalVariance / geneIds.length);
}

// ============================================================================
// Adaptive Rate Calculation
// ============================================================================

export interface AdaptiveRates {
  pointMutationRate: number;
  duplicationRate: number;
  structuralVariationRate: number;
  hgtRate: number;
  reason: string;
}

/**
 * Calculate adaptive mutation rates based on current population state
 */
export function calculateAdaptiveRates(
  metrics: PopulationMetrics,
  environmentalStress: number,
  config: AdaptiveMutationConfig = DEFAULT_ADAPTIVE_CONFIG
): AdaptiveRates {
  let rate = config.baseRate;
  const reasons: string[] = [];
  
  // 1. 多样性检查
  if (metrics.geneticDiversity < config.diversityThreshold) {
    const diversityFactor = 1 + (config.diversityThreshold - metrics.geneticDiversity) * 4;
    rate *= diversityFactor;
    reasons.push(`low_diversity(${metrics.geneticDiversity.toFixed(3)})`);
  }
  
  // 2. 停滞检查
  const { isStagnant, stagnationFactor } = detectStagnation(
    metrics.fitnessHistory,
    config.stagnationThreshold
  );
  
  if (isStagnant) {
    const stagnationBoost = 1 + stagnationFactor * 2;
    rate *= stagnationBoost;
    reasons.push(`stagnation(${stagnationFactor.toFixed(3)})`);
  }
  
  // 3. 环境应激
  if (environmentalStress > 0.5) {
    const stressBoost = 1 + (environmentalStress - 0.5) * config.stressMultiplier;
    rate *= stressBoost;
    reasons.push(`stress(${environmentalStress.toFixed(3)})`);
  }
  
  // 4. 钳制到有效范围
  const finalRate = Math.max(config.minRate, Math.min(config.maxRate, rate));
  
  // 5. 计算各类突变的派生率
  return {
    pointMutationRate: finalRate,
    duplicationRate: finalRate * 1.5,           // 重复率通常高于点突变
    structuralVariationRate: finalRate * 0.3,   // 结构变异更罕见
    hgtRate: finalRate * 0.5,                   // HGT适中
    reason: reasons.join(', ') || 'baseline',
  };
}

// ============================================================================
// Optimized Configuration Generator
// ============================================================================

/**
 * Generate optimized genetic configuration based on population state
 */
export function generateOptimizedConfig(
  metrics: PopulationMetrics,
  environmentalStress: number,
  adaptiveConfig?: AdaptiveMutationConfig
): OptimizedGeneticConfig {
  const rates = calculateAdaptiveRates(metrics, environmentalStress, adaptiveConfig);
  
  return {
    pointMutationRate: rates.pointMutationRate,
    stressMutationMultiplier: 3.0,
    
    duplicationRate: rates.duplicationRate,
    tandemDuplicationRate: rates.duplicationRate * 0.6,
    
    randomDeletionRate: 0.01,
    selectionDeletionRate: rates.pointMutationRate * 2,
    
    hgtRate: rates.hgtRate,
    hgtClusteringEffect: 0.3,
    
    deNovoRate: rates.pointMutationRate * 0.1,
    deNovoEnvironmentBias: true,
    deNovoDomainPreferences: generateEnvironmentBiasedDomains(environmentalStress),
    
    inversionRate: rates.structuralVariationRate,
    translocationRate: rates.structuralVariationRate * 0.3,
    
    geneConversionRate: 0.002,
    conversionTractLength: 3,
    
    effectivePopulationSize: calculateEffectivePopulationSize(metrics),
    selectionStrength: 0.1,
    driftParameter: 1.0,
  };
}

function generateEnvironmentBiasedDomains(
  stress: number
): Map<string, number> {
  const prefs = new Map<string, number>();
  
  // 高压力环境偏好应激响应基因
  if (stress > 0.7) {
    prefs.set('STRESS_RESPONSE', 0.4);
    prefs.set('METABOLISM', 0.3);
    prefs.set('DORMANCY', 0.2);
  } else if (stress < 0.2) {
    // 低压力环境偏好探索和繁殖
    prefs.set('ADAPTATION', 0.3);
    prefs.set('MATE_SELECTION', 0.3);
    prefs.set('NOVELTY_SEEKING', 0.2);
  }
  
  return prefs;
}

function calculateEffectivePopulationSize(metrics: PopulationMetrics): number {
  // 使用遗传多样性估计 Ne
  // He = 4Neμ / (1 + 4Neμ)
  // 近似：Ne ≈ He / (4μ)
  const mu = 1e-4; // 假设突变率
  const he = metrics.geneticDiversity;
  return Math.max(10, Math.floor(he / (4 * mu)));
}

// ============================================================================
// Stress-Induced Mutagenesis
// ============================================================================

/**
 * 应激诱变 (Stress-Induced Mutagenesis)
 * 当环境压力超过阈值时，触发特定的突变模式
 */
export interface StressMutagenesisProfile {
  stressThreshold: number;
  mutationTypeWeights: Map<string, number>;
  targetDomains: string[];
  transient: boolean;  // 是否为暂时性增加
}

export const STARVATION_PROFILE: StressMutagenesisProfile = {
  stressThreshold: 0.8,
  mutationTypeWeights: new Map([
    ['deletion', 0.5],      // 删除高成本基因
    ['duplication', 0.1],   // 减少重复
    ['point_mutation', 0.3],
    ['structural', 0.1],
  ]),
  targetDomains: ['METABOLISM', 'DORMANCY', 'STRESS_RESPONSE'],
  transient: true,
};

export const COMPETITION_PROFILE: StressMutagenesisProfile = {
  stressThreshold: 0.7,
  mutationTypeWeights: new Map([
    ['duplication', 0.3],
    ['point_mutation', 0.4],
    ['hgt', 0.2],           // 竞争压力下增加HGT
    ['structural', 0.1],
  ]),
  targetDomains: ['COMPETITION', 'DECEPTION_DETECTION', 'ADAPTATION'],
  transient: true,
};

export function applyStressMutagenesis(
  baseRate: number,
  stress: number,
  profile: StressMutagenesisProfile
): { rate: number; bias: Map<string, number> } {
  if (stress < profile.stressThreshold) {
    return { rate: baseRate, bias: new Map() };
  }
  
  const stressIntensity = (stress - profile.stressThreshold) / (1 - profile.stressThreshold);
  const boostedRate = baseRate * (1 + stressIntensity * 2);
  
  return {
    rate: boostedRate,
    bias: profile.mutationTypeWeights,
  };
}

// ============================================================================
// Mutation Rate Tracker
// ============================================================================

export class MutationRateTracker {
  private history: Array<{
    generation: number;
    rates: AdaptiveRates;
    metrics: PopulationMetrics;
  }> = [];
  
  private currentRates: AdaptiveRates;
  
  constructor(initialRates?: AdaptiveRates) {
    this.currentRates = initialRates || {
      pointMutationRate: 0.03,
      duplicationRate: 0.05,
      structuralVariationRate: 0.01,
      hgtRate: 0.02,
      reason: 'initial',
    };
  }
  
  update(metrics: PopulationMetrics, stress: number): AdaptiveRates {
    this.currentRates = calculateAdaptiveRates(metrics, stress);
    
    this.history.push({
      generation: metrics.generation,
      rates: { ...this.currentRates },
      metrics: { ...metrics },
    });
    
    // 保持最近100代的历史
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    return this.currentRates;
  }
  
  getCurrentRates(): AdaptiveRates {
    return this.currentRates;
  }
  
  getHistory(): typeof this.history {
    return this.history;
  }
  
  getStats(): {
    averageRate: number;
    rateVariance: number;
    adaptationEvents: number;
  } {
    if (this.history.length === 0) {
      return { averageRate: 0, rateVariance: 0, adaptationEvents: 0 };
    }
    
    const rates = this.history.map(h => h.rates.pointMutationRate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / rates.length;
    
    // 计算适应性事件（突变率显著变化）
    let adaptationEvents = 0;
    for (let i = 1; i < rates.length; i++) {
      if (Math.abs(rates[i] - rates[i-1]) > 0.05) {
        adaptationEvents++;
      }
    }
    
    return {
      averageRate: avg,
      rateVariance: variance,
      adaptationEvents,
    };
  }
}
