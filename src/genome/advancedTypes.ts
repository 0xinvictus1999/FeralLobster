/**
 * Axobase v2 - Advanced Genome Types
 * 
 * Extended type definitions for:
 * - Adaptive mutation
 * - Non-linear regulatory logic
 * - Developmental plasticity
 * - Epistasis networks
 * - Structural variation
 */

import { GeneDomain, GeneOrigin, ExpressionState, RegulatoryEdge } from './types.js';

// ============================================================================
// Adaptive Mutation
// ============================================================================

export interface AdaptiveMutationConfig {
  baseRate: number;
  diversityThreshold: number;      // 低于此多样性增加突变
  stagnationThreshold: number;     // 多少代停滞触发突变增加
  stressMultiplier: number;        // 压力下突变率倍数
  maxRate: number;                 // 突变率上限
  minRate: number;                 // 突变率下限
}

export interface PopulationMetrics {
  averageFitness: number;
  fitnessVariance: number;
  geneticDiversity: number;        // 0-1, 基于基因组差异
  generation: number;
  fitnessHistory: number[];        // 最近N代平均适应度
}

// ============================================================================
// Non-linear Regulatory Logic
// ============================================================================

export enum RegulatoryLogic {
  ADDITIVE = 'additive',
  MULTIPLICATIVE = 'multiplicative',
  THRESHOLD = 'threshold',
  AND = 'and',
  OR = 'or',
  NAND = 'nand',
  OSCILLATOR = 'oscillator',
  SWITCH = 'switch',
}

export interface EnhancedRegulatoryEdge extends RegulatoryEdge {
  logic: RegulatoryLogic;
  threshold?: number;              // 阈值 (0-1)
  cooperativity?: number;          // Hill系数 (默认2)
  phase?: number;                  // 振荡器相位
  period?: number;                 // 振荡周期 (小时)
}

// ============================================================================
// Developmental Plasticity
// ============================================================================

export enum DevelopmentalStage {
  NEONATE = 'neonate',            // 0-7天：关键学习期
  JUVENILE = 'juvenile',          // 7-30天：探索期
  ADULT = 'adult',                // 30天+：成熟期
  SENESCENT = 'senescent',        // 老化期
}

export interface DevelopmentalState {
  stage: DevelopmentalStage;
  age: number;                     // 天数
  criticalWindows: Map<GeneDomain, boolean>;
  peakPerformance: boolean;        // 是否处于巅峰状态
}

export interface CriticalWindow {
  domain: GeneDomain;
  startAge: number;
  endAge: number;
  plasticityMultiplier: number;
  permanentEffects: boolean;       // 是否永久影响
}

// ============================================================================
// Epistasis (Gene-Gene Interaction)
// ============================================================================

export enum EpistaticRelationship {
  DOMINANT = 'dominant',          // 上位基因显性
  RECESSIVE = 'recessive',        // 上位基因隐性
  SUPPRESSIVE = 'suppressive',    // 完全抑制
  SYNERGISTIC = 'synergistic',    // 协同增强
  ANTAGONISTIC = 'antagonistic',  // 拮抗
}

export interface EpistaticInteraction {
  epistaticGene: string;          // 上位基因（掩盖者）
  hypostaticGene: string;         // 下位基因（被掩盖者）
  relationship: EpistaticRelationship;
  penetrance: number;             // 外显率 (0-1)
  conditional?: {                 // 条件性上位
    environment: string;
    threshold: number;
  };
}

// ============================================================================
// Structural Variation
// ============================================================================

export interface StructuralVariation {
  type: 'inversion' | 'translocation' | 'duplication_block' | 'deletion_block';
  chromosomeId: string;
  startIndex: number;
  endIndex: number;
  // 对于易位
  targetChromosome?: string;
  targetIndex?: number;
  // 对于倒位：影响调控方向
  inverted?: boolean;
}

export interface ChromosomalRearrangement {
  variations: StructuralVariation[];
  fitnessEffect: number;           // 对适应度的影响
  noveltyScore: number;            // 新颖性（用于追踪创新）
}

// ============================================================================
// Metabolic Network
// ============================================================================

export enum Metabolite {
  ATP = 'ATP',
  NADH = 'NADH',
  AMINO_ACIDS = 'AMINO_ACIDS',
  LIPIDS = 'LIPIDS',
  NUCLEOTIDES = 'NUCLEOTIDES',
}

export interface MetabolicReaction {
  id: string;
  inputs: Map<Metabolite, number>;
  outputs: Map<Metabolite, number>;
  catalyzedBy: string[];           // 催化基因IDs
  baselineRate: number;
  reversible: boolean;
}

export interface MetabolicState {
  pools: Map<Metabolite, number>;
  fluxes: Map<string, number>;     // 反应通量
  bottlenecks: Metabolite[];
  totalEfficiency: number;
}

// ============================================================================
// Selection & Genetic Load
// ============================================================================

export interface SelectionCoefficients {
  geneId: string;
  s: number;                       // 选择系数，+有利，-有害
  h: number;                       // 显性系数
  environment: string;
}

export interface GeneticLoad {
  lethalMutations: number;
  deleteriousMutations: number;
  compensatoryMutations: number;
  totalLoad: number;
}

// ============================================================================
// Gene Conversion
// ============================================================================

export interface GeneConversionEvent {
  donorGeneId: string;
  recipientGeneId: string;
  convertedSequence: 'value' | 'weight' | 'regulatory' | 'all';
  conversionRatio: number;         // 供体:受体比例
  timestamp: number;
}

// ============================================================================
// Optimized Configuration
// ============================================================================

export interface OptimizedGeneticConfig {
  // 基础突变
  pointMutationRate: number;
  stressMutationMultiplier: number;
  
  // 基因重复
  duplicationRate: number;
  tandemDuplicationRate: number;   // 串联重复（更接近）
  
  // 删除（选择驱动）
  randomDeletionRate: number;
  selectionDeletionRate: number;   // 净化选择强度
  
  // HGT
  hgtRate: number;
  hgtClusteringEffect: number;     // 合作网络效应
  
  // De Novo
  deNovoRate: number;
  deNovoEnvironmentBias: boolean;
  deNovoDomainPreferences: Map<GeneDomain, number>;
  
  // 结构变异
  inversionRate: number;
  translocationRate: number;
  
  // 基因转换
  geneConversionRate: number;
  conversionTractLength: number;   // 转换片段长度
  
  // 选择
  effectivePopulationSize: number;
  selectionStrength: number;
  driftParameter: number;
}

// ============================================================================
// Caching
// ============================================================================

export interface ExpressionCacheEntry {
  result: unknown;  // ExpressedGenome
  timestamp: number;
  environmentHash: string;
  ttl: number;
  hitCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}
