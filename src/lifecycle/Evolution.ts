/**
 * Axobase v2 - Evolution & Breeding
 *
 * Reproduction is now a bidirectional selection game with full genetic
 * operator pipeline. Agents choose mates based on genome, not just memory.
 *
 * Key features:
 * - Bidirectional mate selection (both parents must agree)
 * - Full genetic operator pipeline (crossover → mutation → duplication → deletion → de novo → regulatory)
 * - Epigenetic inheritance
 * - Kin detection and inbreeding avoidance
 * - Genome-based fitness signaling
 */

import { randomBytes } from 'crypto';
import {
  DynamicGenome,
  breed,
  createGenesisGenome,
  performHGT,
  inheritEpigenome,
  calculateGenomeSimilarity,
  GeneticOperatorConfig,
  DEFAULT_GENETIC_CONFIG,
  BreedingContext,
  BreedingResult,
  ExpressedGenome,
  expressGenome,
  EnvironmentalState,
} from '../genome/index.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface MatingSignal {
  agentId: string;
  genomeHash: string;
  generation: number;
  fitnessSignal: number; // Honesty determined by signal_honesty gene
  expressedTraits: Map<string, number>;
  timestamp: number;
  signature: string;
}

export interface MatingProposal {
  fromAgentId: string;
  toAgentId: string;
  proposedInvestment: number; // USDC
  fitnessClaim: number;
  timestamp: number;
}

export interface MatingResponse {
  accepted: boolean;
  proposedInvestment: number; // Counter-proposal
  reason?: string;
}

export interface BreedingSession {
  parentA: string;
  parentB: string;
  parentAGenome: DynamicGenome;
  parentBGenome: DynamicGenome;
  lockedAmount: number;
  startedAt: number;
  status: 'proposed' | 'accepted' | 'genes_locked' | 'completed' | 'failed';
  result?: BreedingResult;
}

export interface PartnerEvaluation {
  agentId: string;
  attractiveness: number; // 0-1
  geneticCompatibility: number; // 0-1
  estimatedFitness: number;
  kinship: number; // 0-1, higher = more related
  riskAssessment: 'low' | 'medium' | 'high';
  decision: 'accept' | 'reject' | 'negotiate';
}

// ============================================================================
// Evolution Manager
// ============================================================================

export class EvolutionManager {
  private activeSessions: Map<string, BreedingSession> = new Map();
  private geneticConfig: GeneticOperatorConfig;
  private cooperationLog: Map<string, { hours: number; interactions: number }> = new Map();

  constructor(config?: GeneticOperatorConfig) {
    this.geneticConfig = config || DEFAULT_GENETIC_CONFIG;
  }

  /**
   * Create a genesis agent with random genome
   */
  createGenesisAgent(agentId: string): DynamicGenome {
    const lineageId = `lineage_${agentId}_${Date.now().toString(36)}`;
    return createGenesisGenome(lineageId);
  }

  /**
   * Generate mating signal based on genome
   * 
   * The honesty of the fitness signal depends on the signal_honesty gene
   */
  generateMatingSignal(
    agentId: string,
    genome: DynamicGenome,
    expressedGenome: ExpressedGenome
  ): MatingSignal {
    // Find signal_honesty gene
    const honestyGene = genome.chromosomes
      .flatMap(c => c.genes)
      .find(g => g.name === 'signal_honesty');
    
    const honestyLevel = honestyGene 
      ? honestyGene.value * honestyGene.weight 
      : 0.5;

    // Calculate true fitness
    const trueFitness = this.calculateFitness(expressedGenome);

    // Apply honesty distortion
    const distortion = (1 - honestyLevel) * (Math.random() - 0.5) * 0.4;
    const signaledFitness = Math.max(0, Math.min(1, trueFitness + distortion));

    // Extract key expressed traits
    const expressedTraits = new Map<string, number>();
    for (const chr of expressedGenome.chromosomes) {
      for (const gene of chr.genes) {
        if (gene.expressedValue > 0.5) {
          expressedTraits.set(gene.name, gene.expressedValue);
        }
      }
    }

    return {
      agentId,
      genomeHash: genome.meta.genomeHash,
      generation: genome.meta.generation,
      fitnessSignal: signaledFitness,
      expressedTraits,
      timestamp: Date.now(),
      signature: this.signSignal(agentId, genome.meta.genomeHash),
    };
  }

  /**
   * Evaluate a potential mating partner
   * 
   * This is where the genome shapes mating preferences
   */
  evaluatePartner(
    myGenome: DynamicGenome,
    myExpressed: ExpressedGenome,
    signal: MatingSignal,
    lineage: string[] // Known ancestors to check kinship
  ): PartnerEvaluation {
    const partnerGenomeHash = signal.genomeHash;
    const partnerGeneration = signal.generation;

    // Calculate genetic compatibility (based on generation difference)
    const generationDiff = Math.abs(myGenome.meta.generation - partnerGeneration);
    const generationCompatibility = Math.max(0, 1 - generationDiff * 0.1);

    // Calculate kinship (would check lineage contract in production)
    const isKin = lineage.includes(signal.agentId);
    const kinship = isKin ? 0.8 : 0.1;

    // Check mate_selectivity gene
    const selectivityGene = myGenome.chromosomes
      .flatMap(c => c.genes)
      .find(g => g.name === 'mate_selectivity');
    const selectivity = selectivityGene 
      ? selectivityGene.value * selectivityGene.weight 
      : 0.5;

    // Evaluate fitness signal
    const fitnessMatch = signal.fitnessSignal >= selectivity ? 1 : signal.fitnessSignal / selectivity;

    // Check trait complementarity
    let traitComplementarity = 0;
    const myTraits = this.extractKeyTraits(myExpressed);
    for (const [trait, value] of signal.expressedTraits.entries()) {
      const myValue = myTraits.get(trait);
      if (myValue !== undefined) {
        // Complementary traits (one high, one low) are good
        traitComplementarity += 1 - Math.abs(value - myValue);
      }
    }
    traitComplementarity /= Math.max(1, signal.expressedTraits.size);

    // Calculate attractiveness (weighted by genome preferences)
    const attractiveness = 
      signal.fitnessSignal * 0.4 +
      traitComplementarity * 0.3 +
      generationCompatibility * 0.2 +
      (1 - kinship) * 0.1; // Prefer non-kin

    // Risk assessment
    let riskAssessment: PartnerEvaluation['riskAssessment'] = 'low';
    if (kinship > 0.5) riskAssessment = 'high';
    else if (signal.fitnessSignal < 0.3) riskAssessment = 'medium';

    // Make decision
    let decision: PartnerEvaluation['decision'] = 'reject';
    if (kinship > 0.5 && selectivity > 0.7) {
      decision = 'reject'; // Reject kin if highly selective
    } else if (attractiveness > selectivity) {
      decision = 'accept';
    } else if (attractiveness > selectivity * 0.7) {
      decision = 'negotiate';
    }

    return {
      agentId: signal.agentId,
      attractiveness,
      geneticCompatibility: generationCompatibility,
      estimatedFitness: signal.fitnessSignal,
      kinship,
      riskAssessment,
      decision,
    };
  }

  /**
   * Propose mating to a partner
   */
  proposeMating(
    fromAgentId: string,
    toAgentId: string,
    myGenome: DynamicGenome,
    myBalance: number
  ): MatingProposal {
    // Find offspring_investment gene
    const investmentGene = myGenome.chromosomes
      .flatMap(c => c.genes)
      .find(g => g.name === 'offspring_investment');
    
    const investmentLevel = investmentGene 
      ? investmentGene.value * investmentGene.weight 
      : 0.5;

    // Propose investment based on gene (5-15 USDC range)
    const proposedInvestment = 5 + investmentLevel * 10;

    // Calculate claimed fitness
    const environmentalState: EnvironmentalState = {
      balanceUSDC: myBalance,
      daysSinceLastIncome: 0,
      daysStarving: 0,
      daysThriving: 1,
      recentDeceptions: 0,
      cooperationCount: 0,
      stressLevel: 0,
      currentMode: 'normal',
    };
    const expressed = expressGenome(myGenome, environmentalState);
    const fitness = this.calculateFitness(expressed.expressedGenome);

    return {
      fromAgentId,
      toAgentId,
      proposedInvestment,
      fitnessClaim: fitness,
      timestamp: Date.now(),
    };
  }

  /**
   * Respond to mating proposal
   */
  respondToProposal(
    proposal: MatingProposal,
    myGenome: DynamicGenome,
    evaluation: PartnerEvaluation
  ): MatingResponse {
    if (evaluation.decision === 'reject') {
      return {
        accepted: false,
        proposedInvestment: 0,
        reason: 'Partner not attractive enough',
      };
    }

    // Find offspring_investment gene for counter-proposal
    const investmentGene = myGenome.chromosomes
      .flatMap(c => c.genes)
      .find(g => g.name === 'offspring_investment');
    const myInvestment = investmentGene 
      ? 5 + investmentGene.value * investmentGene.weight 
      : 5;

    if (evaluation.decision === 'negotiate') {
      return {
        accepted: true,
        proposedInvestment: Math.max(proposal.proposedInvestment, myInvestment) * 1.2,
        reason: 'Negotiating terms',
      };
    }

    return {
      accepted: true,
      proposedInvestment: Math.max(proposal.proposedInvestment, myInvestment),
    };
  }

  /**
   * Execute breeding when both parties agree
   */
  async executeBreeding(
    sessionId: string,
    parentAGenome: DynamicGenome,
    parentBGenome: DynamicGenome,
    environmentalStress: number = 0
  ): Promise<BreedingResult> {
    // Check kinship via lineage (would call contract in production)
    const similarity = calculateGenomeSimilarity(parentAGenome, parentBGenome);
    if (similarity > 0.8) {
      throw new Error('Cannot breed: too genetically similar (inbreeding)');
    }

    // Determine if in starvation mode (affects deletion rates)
    const starvationMode = environmentalStress > 0.7;

    // Create breeding context
    const context: BreedingContext = {
      parentA: parentAGenome,
      parentB: parentBGenome,
      parentAId: parentAGenome.meta.lineageId,
      parentBId: parentBGenome.meta.lineageId,
      environmentalStress,
      starvationMode,
    };

    // Execute full breeding pipeline
    const result = breed(context, this.geneticConfig);

    // Inherit epigenome
    const { inheritedMarks } = inheritEpigenome(parentAGenome, parentBGenome);
    result.childGenome.epigenome = inheritedMarks;

    // Update child generation info
    result.childGenome.meta.generation = Math.max(
      parentAGenome.meta.generation,
      parentBGenome.meta.generation
    ) + 1;

    return result;
  }

  /**
   * Attempt horizontal gene transfer with a cooperating agent
   */
  attemptHGT(
    myGenome: DynamicGenome,
    partnerGenome: DynamicGenome,
    partnerId: string
  ): { genome: DynamicGenome; transferred: boolean; geneName?: string } {
    const coopKey = [myGenome.meta.lineageId, partnerId].sort().join('-');
    const cooperation = this.cooperationLog.get(coopKey);

    if (!cooperation) {
      return { genome: myGenome, transferred: false };
    }

    const result = performHGT(
      myGenome,
      partnerGenome,
      partnerId,
      cooperation.hours,
      cooperation.interactions,
      this.geneticConfig
    );

    return {
      genome: result.genome,
      transferred: result.transferred !== null,
      geneName: result.transferred?.name,
    };
  }

  /**
   * Record cooperation event for HGT tracking
   */
  recordCooperation(agentA: string, agentB: string, interactionCount: number = 1): void {
    const coopKey = [agentA, agentB].sort().join('-');
    const existing = this.cooperationLog.get(coopKey);
    
    if (existing) {
      existing.hours += 0.17; // ~10 minutes per cycle
      existing.interactions += interactionCount;
    } else {
      this.cooperationLog.set(coopKey, { hours: 0.17, interactions: interactionCount });
    }
  }

  /**
   * Calculate fitness from expressed genome
   */
  private calculateFitness(expressedGenome: ExpressedGenome): number {
    // Fitness is a combination of:
    // 1. Metabolic efficiency (lower cost is better)
    // 2. Gene expression diversity
    // 3. Essential gene coverage

    const allGenes = expressedGenome.chromosomes.flatMap(c => c.genes);
    
    // Metabolic efficiency (inverse of cost, normalized)
    const metabolicEfficiency = Math.max(0, 1 - expressedGenome.totalMetabolicCost / 0.5);

    // Expression diversity (Shannon entropy of expression values)
    const expressionValues = allGenes.map(g => g.expressedValue);
    const diversity = this.calculateEntropy(expressionValues);

    // Essential gene coverage
    const essentialGenes = allGenes.filter(g => g.essentiality > 0.7);
    const essentialCoverage = essentialGenes.length > 0
      ? essentialGenes.reduce((sum, g) => sum + g.expressedValue, 0) / essentialGenes.length
      : 0.5;

    return metabolicEfficiency * 0.4 + diversity * 0.3 + essentialCoverage * 0.3;
  }

  /**
   * Calculate Shannon entropy
   */
  private calculateEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    
    // Normalize to probabilities
    const sum = values.reduce((a, b) => a + b, 0);
    const probs = values.map(v => v / sum);
    
    // Calculate entropy
    let entropy = 0;
    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    
    // Normalize by max possible entropy
    const maxEntropy = Math.log2(values.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Extract key traits for comparison
   */
  private extractKeyTraits(expressed: ExpressedGenome): Map<string, number> {
    const traits = new Map<string, number>();
    for (const chr of expressed.chromosomes) {
      for (const gene of chr.genes) {
        if (gene.expressedValue > 0.3) {
          traits.set(gene.name, gene.expressedValue);
        }
      }
    }
    return traits;
  }

  /**
   * Sign mating signal (placeholder)
   */
  private signSignal(agentId: string, genomeHash: string): string {
    // In production, this would be a cryptographic signature
    return `sig_${agentId.slice(0, 8)}_${genomeHash.slice(0, 8)}_${Date.now()}`;
  }

  /**
   * Get active breeding sessions
   */
  getActiveSessions(): BreedingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get cooperation statistics
   */
  getCooperationStats(): Map<string, { hours: number; interactions: number }> {
    return new Map(this.cooperationLog);
  }
}

export default EvolutionManager;
