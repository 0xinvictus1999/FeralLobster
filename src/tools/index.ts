/**
 * Axobase v2 - Agent Tools
 * 
 * All tools available to agents for interacting with the world.
 * Each tool call is gated by the decision engine based on genome expression.
 */

export { WalletTool, WalletConfig } from './WalletTool.js';
export { DEXTool, DEXConfig } from './DEXTool.js';
export { WebTool, WebConfig } from './WebTool.js';
export { InferenceTool, InferenceConfig } from './InferenceTool.js';
export { HumanTool, HumanConfig } from './HumanTool.js';
export { NetworkTool, NetworkConfig } from './NetworkTool.js';
export { MemoryTool, MemoryConfig } from './MemoryTool.js';
export { ReproductionTool, ReproductionConfig } from './ReproductionTool.js';

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  cost: number; // USDC cost of operation
}

export interface Tool {
  name: string;
  description: string;
  execute(params: unknown): Promise<ToolResult>;
  estimateCost(params: unknown): number;
}
