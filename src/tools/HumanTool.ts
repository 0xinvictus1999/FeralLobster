/**
 * Human Tool - Hire humans via RentAHuman.ai MCP
 */

import { Tool, ToolResult } from './index.js';

export interface HumanConfig {
  mcpEndpoint: string;
  apiKey: string;
  agentId: string;
}

export interface HumanTask {
  id: string;
  description: string;
  reward: number;
  deadline: number;
  status: 'open' | 'assigned' | 'completed' | 'disputed';
  assignee?: string;
  result?: string;
}

export class HumanTool implements Tool {
  name = 'human';
  description = 'Hire humans for tasks via MCP';
  
  private config: HumanConfig;
  private activeTasks: Map<string, HumanTask> = new Map();

  constructor(config: HumanConfig) {
    this.config = config;
  }

  async execute(params: unknown): Promise<ToolResult> {
    const { action, ...args } = params as { action: string };
    
    switch (action) {
      case 'postTask':
        return this.postTask(args);
      case 'browseHumans':
        return this.browseHumans(args);
      case 'hireHuman':
        return this.hireHuman(args);
      case 'evaluateWork':
        return this.evaluateWork(args);
      default:
        return { success: false, error: 'Unknown action', cost: 0 };
    }
  }

  estimateCost(params: unknown): number {
    const { action } = params as { action: string };
    switch (action) {
      case 'postTask': return 0.01;
      case 'browseHumans': return 0.005;
      case 'hireHuman': return 5.0;
      case 'evaluateWork': return 0.01;
      default: return 0.01;
    }
  }

  private async postTask(args: unknown): Promise<ToolResult> {
    const { description, reward, deadline } = args as {
      description: string;
      reward: number;
      deadline: number;
    };

    const task: HumanTask = {
      id: `task_${Date.now()}`,
      description,
      reward,
      deadline: Date.now() + deadline * 1000,
      status: 'open',
    };

    this.activeTasks.set(task.id, task);

    return {
      success: true,
      data: { taskId: task.id, status: 'posted' },
      cost: 0.01,
    };
  }

  private async browseHumans(args: unknown): Promise<ToolResult> {
    // Query RentAHuman for available workers
    return {
      success: true,
      data: {
        available: [
          { id: 'human_1', skills: ['coding', 'research'], rate: 10 },
          { id: 'human_2', skills: ['writing', 'design'], rate: 15 },
        ],
      },
      cost: 0.005,
    };
  }

  private async hireHuman(args: unknown): Promise<ToolResult> {
    const { humanId, taskId } = args as { humanId: string; taskId: string };
    
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found', cost: 0 };
    }

    task.assignee = humanId;
    task.status = 'assigned';

    return {
      success: true,
      data: { taskId, humanId, status: 'assigned' },
      cost: task.reward,
    };
  }

  private async evaluateWork(args: unknown): Promise<ToolResult> {
    const { taskId, accept } = args as { taskId: string; accept: boolean };
    
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return { success: false, error: 'Task not found', cost: 0 };
    }

    task.status = accept ? 'completed' : 'disputed';

    return {
      success: true,
      data: { taskId, status: task.status },
      cost: 0.01,
    };
  }
}
