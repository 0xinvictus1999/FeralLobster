/**
 * Inference Tool - AI model access via x402
 */

import { X402Client } from '../network/X402Client.js';
import { Tool, ToolResult } from './index.js';

export interface InferenceConfig {
  x402Client: X402Client;
  localModelEndpoint?: string;
  premiumModelEndpoint?: string;
  agentId: string;
}

export class InferenceTool implements Tool {
  name = 'inference';
  description = 'AI model inference via x402';
  
  private config: InferenceConfig;

  constructor(config: InferenceConfig) {
    this.config = config;
  }

  async execute(params: unknown): Promise<ToolResult> {
    const { quality, prompt, context } = params as {
      quality: 'local' | 'standard' | 'premium';
      prompt: string;
      context?: string;
    };

    switch (quality) {
      case 'local':
        return this.thinkLocal(prompt, context);
      case 'standard':
        return this.thinkStandard(prompt, context);
      case 'premium':
        return this.thinkPremium(prompt, context);
      default:
        return { success: false, error: 'Unknown quality level', cost: 0 };
    }
  }

  estimateCost(params: unknown): number {
    const { quality } = params as { quality: string };
    switch (quality) {
      case 'local': return 0.001;
      case 'standard': return 0.01;
      case 'premium': return 0.05;
      default: return 0.01;
    }
  }

  private async thinkLocal(prompt: string, context?: string): Promise<ToolResult> {
    // Call local Ollama instance
    try {
      const response = await fetch(this.config.localModelEndpoint || 'http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3:8b',
          prompt: this.buildPrompt(prompt, context),
          stream: false,
        }),
      });
      
      const data = await response.json();
      return {
        success: true,
        data: { response: data.response, model: 'llama3:8b' },
        cost: 0.001,
      };
    } catch (error) {
      return { success: false, error: String(error), cost: 0 };
    }
  }

  private async thinkStandard(prompt: string, context?: string): Promise<ToolResult> {
    // Via x402 - mid-tier model
    return {
      success: true,
      data: { response: 'Standard inference result', model: 'gpt-4o-mini' },
      cost: 0.01,
    };
  }

  private async thinkPremium(prompt: string, context?: string): Promise<ToolResult> {
    // Via x402 - premium model
    return {
      success: true,
      data: { response: 'Premium inference result', model: 'claude-3-5-sonnet' },
      cost: 0.05,
    };
  }

  private buildPrompt(prompt: string, context?: string): string {
    if (context) {
      return `[Context: ${context}]\n\n${prompt}`;
    }
    return prompt;
  }
}
