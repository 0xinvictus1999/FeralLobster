/**
 * Axobase v2 - Enhanced Expression Engine
 * 
 * Advanced expression calculation with:
 * - Non-linear regulatory logic (AND/OR/THRESHOLD/OSCILLATOR)
 * - Developmental stage modifiers
 * - Epistasis (gene-gene interaction)
 * - Hill function for switch-like behavior
 */

import {
  DynamicGenome,
  ExpressedGenome,
  ExpressedGene,
  Chromosome,
  Gene,
  ExpressionState,
  EnvironmentalState,
} from './types.js';
import {
  RegulatoryLogic,
  EnhancedRegulatoryEdge,
  DevelopmentalStage,
  DevelopmentalState,
  CriticalWindow,
  EpistaticInteraction,
  EpistaticRelationship,
} from './advancedTypes.js';
import { GeneDomain } from './types.js';

// ============================================================================
// Configuration
// ============================================================================

export interface EnhancedExpressionConfig {
  baseMetabolicRate: number;
  perGeneOverhead: number;
  maxRegulatoryEffect: number;
  minRegulatoryEffect: number;
  epigeneticDecayPerGeneration: number;
  // 新参数
  hillCoefficientDefault: number;
  oscillationEnabled: boolean;
  developmentalPlasticityEnabled: boolean;
  epistasisEnabled: boolean;
}

export const DEFAULT_ENHANCED_CONFIG: EnhancedExpressionConfig = {
  baseMetabolicRate: 0.001,
  perGeneOverhead: 0.00005,
  maxRegulatoryEffect: 3.0,
  minRegulatoryEffect: 0.05,
  epigeneticDecayPerGeneration: 0.1,
  hillCoefficientDefault: 2,
  oscillationEnabled: true,
  developmentalPlasticityEnabled: true,
  epistasisEnabled: true,
};

// ============================================================================
// Developmental State Management
// ============================================================================

const DEFAULT_CRITICAL_WINDOWS: CriticalWindow[] = [
  { domain: GeneDomain.LEARNING, startAge: 0, endAge: 7, plasticityMultiplier: 1.5, permanentEffects: true },
  { domain: GeneDomain.COOPERATION, startAge: 0, endAge: 14, plasticityMultiplier: 1.3, permanentEffects: true },
  { domain: GeneDomain.MATE_SELECTION, startAge: 3, endAge: 21, plasticityMultiplier: 1.2, permanentEffects: false },
  { domain: GeneDomain.RISK_ASSESSMENT, startAge: 7, endAge: 30, plasticityMultiplier: 1.4, permanentEffects: false },
];

export function calculateDevelopmentalStage(age: number): DevelopmentalStage {
  if (age < 7) return DevelopmentalStage.NEONATE;
  if (age < 30) return DevelopmentalStage.JUVENILE;
  if (age < 90) return DevelopmentalStage.ADULT;
  return DevelopmentalStage.SENESCENT;
}

export function createDevelopmentalState(age: number): DevelopmentalState {
  const stage = calculateDevelopmentalStage(age);
  const criticalWindows = new Map<GeneDomain, boolean>();

  for (const window of DEFAULT_CRITICAL_WINDOWS) {
    if (age >= window.startAge && age <= window.endAge) {
      criticalWindows.set(window.domain, true);
    }
  }

  return {
    stage,
    age,
    criticalWindows,
    peakPerformance: stage === DevelopmentalStage.ADULT && age < 60,
  };
}

function calculateDevelopmentalModifier(
  gene: Gene,
  state: DevelopmentalState
): number {
  let modifier = 1.0;

  switch (state.stage) {
    case DevelopmentalStage.NEONATE:
      // Neonate: 高学习/社交基因表达
      if (gene.domain === GeneDomain.LEARNING) modifier *= 1.5;
      if (gene.domain === GeneDomain.COOPERATION) modifier *= 1.3;
      if (gene.domain === GeneDomain.METABOLISM) modifier *= 0.9; // 代谢较低
      break;

    case DevelopmentalStage.JUVENILE:
      // Juvenile: 探索和风险学习
      if (gene.domain === GeneDomain.ADAPTATION) modifier *= 1.3;
      if (gene.domain === GeneDomain.NOVELTY_SEEKING) modifier *= 1.4;
      if (gene.name === 'planning_horizon') modifier *= 0.8; // 规划能力未成熟
      break;

    case DevelopmentalStage.ADULT:
      // Adult: 繁殖和稳定代谢
      if (gene.domain === GeneDomain.MATE_SELECTION) modifier *= 1.3;
      if (gene.domain === GeneDomain.PARENTAL_INVESTMENT) modifier *= 1.2;
      if (state.peakPerformance) {
        modifier *= 1.1; // 全面巅峰
      }
      break;

    case DevelopmentalStage.SENESCENT:
      // Senescent: 老化效应
      if (gene.name.includes('resilience')) modifier *= 0.7;
      if (gene.name.includes('repair')) modifier *= 0.6;
      if (gene.domain === GeneDomain.METABOLISM) modifier *= 0.85;
      if (gene.domain === GeneDomain.MEMORY) modifier *= 0.9;
      break;
  }

  // 关键期效应
  if (state.criticalWindows.get(gene.domain)) {
    const window = DEFAULT_CRITICAL_WINDOWS.find(w => w.domain === gene.domain);
    if (window) {
      modifier *= window.plasticityMultiplier;
    }
  }

  return modifier;
}

// ============================================================================
// Enhanced Regulatory Network Calculation
// ============================================================================

function hillFunction(x: number, threshold: number, n: number): number {
  // Hill函数: 产生S型开关响应
  return Math.pow(x, n) / (Math.pow(threshold, n) + Math.pow(x, n));
}

function calculateOscillatorValue(
  edge: EnhancedRegulatoryEdge,
  currentTime: number
): number {
  const period = edge.period || 24; // 默认24小时
  const phase = edge.phase || 0;
  const normalizedTime = (currentTime % (period * 3600000)) / (period * 3600000);
  
  // 正弦振荡，映射到0-1
  return (Math.sin(2 * Math.PI * normalizedTime + phase) + 1) / 2;
}

function calculateThresholdEffect(
  sourceValue: number,
  edge: EnhancedRegulatoryEdge
): number {
  const threshold = edge.threshold || 0.5;
  const n = edge.cooperativity || 2;
  
  // 使用Hill函数产生开关行为
  return hillFunction(sourceValue, threshold, n);
}

function calculateLogicGateEffect(
  edges: EnhancedRegulatoryEdge[],
  logic: RegulatoryLogic,
  geneMap: Map<string, ExpressedGene>
): number {
  const values = edges.map(edge => {
    const source = geneMap.get(edge.sourceGeneId);
    if (!source || source.expressionState !== ExpressionState.ACTIVE) return 0;
    return edge.strength * source.expressedValue;
  });

  switch (logic) {
    case RegulatoryLogic.AND:
      // 所有输入都必须活跃
      return values.every(v => v > 0.3) 
        ? Math.min(...values.filter(v => v > 0)) 
        : 0;

    case RegulatoryLogic.OR:
      // 任一输入活跃即可
      return Math.max(...values, 0);

    case RegulatoryLogic.NAND:
      // 所有输入都活跃时抑制
      return values.every(v => v > 0.3) 
        ? 0 
        : Math.max(...values, 0) * 0.5;

    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function calculateEnhancedRegulatoryEffects(
  genes: ExpressedGene[],
  network: EnhancedRegulatoryEdge[],
  currentTime: number,
  config: EnhancedExpressionConfig
): Map<string, number> {
  const effects = new Map<string, number>();
  const geneMap = new Map(genes.map(g => [g.id, g]));

  // 按目标基因分组
  const edgesByTarget = new Map<string, EnhancedRegulatoryEdge[]>();
  for (const edge of network) {
    const edges = edgesByTarget.get(edge.targetGeneId) || [];
    edges.push(edge);
    edgesByTarget.set(edge.targetGeneId, edges);
  }

  // 迭代直到收敛
  const maxIterations = 10;
  const convergenceThreshold = 0.001;

  // 初始化
  for (const gene of genes) {
    effects.set(gene.id, 1.0);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    let maxChange = 0;

    for (const gene of genes) {
      const incomingEdges = edgesByTarget.get(gene.id) || [];
      if (incomingEdges.length === 0) continue;

      const oldEffect = effects.get(gene.id) || 1.0;
      let newEffect = 1.0;

      // 按逻辑类型分组处理
      const byLogic = new Map<RegulatoryLogic, EnhancedRegulatoryEdge[]>();
      for (const edge of incomingEdges) {
        const logic = edge.logic || RegulatoryLogic.ADDITIVE;
        const edges = byLogic.get(logic) || [];
        edges.push(edge);
        byLogic.set(logic, edges);
      }

      // 处理每种逻辑
      for (const [logic, edges] of byLogic.entries()) {
        const activators = edges.filter(e => e.relationship === 'activation');
        const inhibitors = edges.filter(e => e.relationship === 'inhibition');

        switch (logic) {
          case RegulatoryLogic.ADDITIVE:
          case RegulatoryLogic.MULTIPLICATIVE:
            for (const edge of activators) {
              const source = geneMap.get(edge.sourceGeneId);
              if (source && source.expressionState === ExpressionState.ACTIVE) {
                const sourceValue = source.expressedValue * (effects.get(source.id) || 1.0);
                newEffect *= (1 + edge.strength * sourceValue * 0.3);
              }
            }
            break;

          case RegulatoryLogic.THRESHOLD:
            for (const edge of activators) {
              const source = geneMap.get(edge.sourceGeneId);
              if (source) {
                const thresholdEffect = calculateThresholdEffect(
                  source.expressedValue,
                  edge
                );
                newEffect *= (1 + edge.strength * thresholdEffect);
              }
            }
            break;

          case RegulatoryLogic.OSCILLATOR:
            if (config.oscillationEnabled) {
              for (const edge of activators) {
                const oscValue = calculateOscillatorValue(edge, currentTime);
                newEffect *= (1 + edge.strength * oscValue * 0.5);
              }
            }
            break;

          case RegulatoryLogic.AND:
          case RegulatoryLogic.OR:
          case RegulatoryLogic.NAND:
            const logicEffect = calculateLogicGateEffect(activators, logic, geneMap);
            newEffect *= (1 + logicEffect);
            break;
        }

        // 抑制效应 (通常是乘法的)
        for (const edge of inhibitors) {
          const source = geneMap.get(edge.sourceGeneId);
          if (source && source.expressionState === ExpressionState.ACTIVE) {
            const sourceValue = source.expressedValue * (effects.get(source.id) || 1.0);
            newEffect *= Math.max(0.1, 1 - edge.strength * sourceValue);
          }
        }
      }

      // 钳制
      newEffect = Math.max(config.minRegulatoryEffect, 
                          Math.min(config.maxRegulatoryEffect, newEffect));

      const change = Math.abs(newEffect - oldEffect);
      maxChange = Math.max(maxChange, change);
      effects.set(gene.id, newEffect);
    }

    if (maxChange < convergenceThreshold) break;
  }

  return effects;
}

// ============================================================================
// Epistasis (Gene-Gene Interaction)
// ============================================================================

export function applyEpistasis(
  genes: ExpressedGene[],
  interactions: EpistaticInteraction[]
): ExpressedGene[] {
  const geneMap = new Map(genes.map(g => [g.id, g]));

  for (const interaction of interactions) {
    const epistatic = geneMap.get(interaction.epistaticGene);
    const hypostatic = geneMap.get(interaction.hypostaticGene);

    if (!epistatic || !hypostatic) continue;

    // 检查条件性上位
    if (interaction.conditional) {
      // 简化处理：假设条件已满足
      // 在实际实现中，需要根据environmentalState判断
    }

    const eValue = epistatic.expressedValue;
    const penetrance = interaction.penetrance;

    switch (interaction.relationship) {
      case EpistaticRelationship.DOMINANT:
        // 上位基因显性：掩盖下位基因
        if (eValue > 0.5) {
          hypostatic.expressedValue *= (1 - penetrance * (eValue - 0.5) * 2);
        }
        break;

      case EpistaticRelationship.RECESSIVE:
        // 上位基因隐性：只有上位基因低表达时，下位基因才表达
        if (eValue < 0.3) {
          hypostatic.expressedValue *= (1 + penetrance * (0.3 - eValue) * 2);
        } else {
          hypostatic.expressedValue *= (1 - penetrance * (eValue - 0.3));
        }
        break;

      case EpistaticRelationship.SUPPRESSIVE:
        // 完全抑制
        if (eValue > 0.5) {
          hypostatic.expressionState = ExpressionState.SILENCED;
          hypostatic.expressedValue = 0;
        }
        break;

      case EpistaticRelationship.SYNERGISTIC:
        // 协同增强
        if (eValue > 0.3 && hypostatic.expressedValue > 0.3) {
          const synergy = 1 + penetrance * eValue * hypostatic.expressedValue;
          hypostatic.expressedValue *= synergy;
          epistatic.expressedValue *= synergy;
        }
        break;

      case EpistaticRelationship.ANTAGONISTIC:
        // 拮抗
        if (eValue > 0.5) {
          hypostatic.expressedValue *= (1 - penetrance * eValue);
        } else if (hypostatic.expressedValue > 0.5) {
          epistatic.expressedValue *= (1 - penetrance * hypostatic.expressedValue);
        }
        break;
    }
  }

  return genes;
}

// ============================================================================
// Main Enhanced Expression Function
// ============================================================================

export interface EnhancedExpressionResult {
  expressedGenome: ExpressedGenome;
  developmentalState: DevelopmentalState;
  regulatoryEffects: Map<string, number>;
  epistasisApplied: boolean;
  statistics: {
    totalGenes: number;
    activeGenes: number;
    silencedGenes: number;
    oscillatingGenes: number;
    totalMetabolicCost: number;
  };
}

export function expressGenomeEnhanced(
  genome: DynamicGenome,
  environment: EnvironmentalState,
  age: number,
  currentTime: number = Date.now(),
  epistasisInteractions: EpistaticInteraction[] = [],
  config: EnhancedExpressionConfig = DEFAULT_ENHANCED_CONFIG
): EnhancedExpressionResult {
  // 1. 创建发育状态
  const devState = createDevelopmentalState(age);

  // 2. 基础基因表达
  const allGenes: ExpressedGene[] = [];

  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      // 条件表达检查
      let expressionState = gene.expressionState;
      // ... 条件检查逻辑

      // 发育修饰
      const devModifier = config.developmentalPlasticityEnabled
        ? calculateDevelopmentalModifier(gene, devState)
        : 1.0;

      allGenes.push({
        ...gene,
        expressionState,
        expressedValue: gene.value * gene.weight * devModifier,
        regulatoryEffect: 1.0,
        epigeneticEffect: 1.0,
      });
    }
  }

  // 3. 计算调控网络效应
  const regulatoryEffects = calculateEnhancedRegulatoryEffects(
    allGenes,
    genome.regulatoryNetwork as EnhancedRegulatoryEdge[],
    currentTime,
    config
  );

  // 4. 应用调控效应
  for (const gene of allGenes) {
    gene.regulatoryEffect = regulatoryEffects.get(gene.id) || 1.0;

    // 检查是否为振荡基因
    const hasOscillator = genome.regulatoryNetwork.some(
      (e: EnhancedRegulatoryEdge) => 
        e.targetGeneId === gene.id && e.logic === RegulatoryLogic.OSCILLATOR
    );

    if (gene.expressionState !== ExpressionState.SILENCED) {
      gene.expressedValue *= gene.regulatoryEffect;
      gene.expressedValue = Math.max(0, Math.min(3.0, gene.expressedValue));
    }
  }

  // 5. 应用上位效应
  let epistasisApplied = false;
  if (config.epistasisEnabled && epistasisInteractions.length > 0) {
    applyEpistasis(allGenes, epistasisInteractions);
    epistasisApplied = true;
  }

  // 6. 构建结果
  const expressedChromosomes = genome.chromosomes.map(chr => ({
    id: chr.id,
    name: chr.name,
    isEssential: chr.isEssential,
    genes: chr.genes
      .map(g => allGenes.find(eg => eg.id === g.id))
      .filter((g): g is ExpressedGene => g !== undefined),
  }));

  // 7. 计算代谢成本
  let totalMetabolicCost = config.baseMetabolicRate;
  totalMetabolicCost += allGenes.length * config.perGeneOverhead;

  for (const gene of allGenes) {
    totalMetabolicCost += gene.metabolicCost * gene.expressedValue;
  }

  const activeGenes = allGenes.filter(g => g.expressionState === ExpressionState.ACTIVE);
  const oscillatingGenes = allGenes.filter(g => {
    return genome.regulatoryNetwork.some(
      (e: EnhancedRegulatoryEdge) => 
        e.targetGeneId === g.id && e.logic === RegulatoryLogic.OSCILLATOR
    );
  });

  const expressedGenome: ExpressedGenome = {
    meta: genome.meta,
    chromosomes: expressedChromosomes,
    totalMetabolicCost,
    regulatoryNetwork: genome.regulatoryNetwork,
  };

  return {
    expressedGenome,
    developmentalState: devState,
    regulatoryEffects,
    epistasisApplied,
    statistics: {
      totalGenes: allGenes.length,
      activeGenes: activeGenes.length,
      silencedGenes: allGenes.length - activeGenes.length,
      oscillatingGenes: oscillatingGenes.length,
      totalMetabolicCost,
    },
  };
}
