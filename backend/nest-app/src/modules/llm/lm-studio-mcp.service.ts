import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

@Injectable()
export class LmStudioMcpService {
  private readonly logger = new Logger(LmStudioMcpService.name);
  private mcpProcess: any = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private eventEmitter = new EventEmitter();
  private buffer = '';

  constructor() {
    this.startMcpServer();
  }

  private startMcpServer() {
    // Path from backend/nest-app to project root
    const serverPath = '../../.specify/mcp-servers/lm-studio-mcp-server.js';

    this.logger.log(`Starting LM Studio MCP Server: ${serverPath}`);

    this.mcpProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LM_STUDIO_URL: process.env.LM_STUDIO_URL || 'http://192.168.56.1:1234',
      },
    });

    // Handle stdout (MCP responses)
    this.mcpProcess.stdout.on('data', (data: Buffer) => {
      this.buffer += data.toString();

      // Try to parse complete JSON-RPC messages
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response: MCPResponse = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          this.logger.debug(`Failed to parse MCP response: ${line}`);
        }
      }
    });

    // Handle stderr (logs)
    this.mcpProcess.stderr.on('data', (data: Buffer) => {
      this.logger.debug(`MCP Server: ${data.toString().trim()}`);
    });

    // Handle process exit
    this.mcpProcess.on('exit', (code: number) => {
      this.logger.warn(`MCP Server exited with code ${code}`);

      // Reject all pending requests
      for (const [id, { reject }] of this.pendingRequests) {
        reject(new Error('MCP Server exited'));
      }
      this.pendingRequests.clear();

      // Restart after delay
      setTimeout(() => this.startMcpServer(), 5000);
    });

    this.logger.log('LM Studio MCP Server started');
  }

  private handleResponse(response: MCPResponse) {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      this.logger.warn(`Received response for unknown request ID: ${response.id}`);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message || JSON.stringify(response.error)));
    } else {
      pending.resolve(response.result);
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      this.mcpProcess.stdin.write(requestStr);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * List all models currently loaded in LM Studio
   */
  async listModels(): Promise<any[]> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'list_models',
        arguments: {},
      });

      const content = result.content?.[0]?.text;
      if (content) {
        return JSON.parse(content);
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to list models via MCP:', error);
      throw error;
    }
  }

  /**
   * Attempt to load a model (may not be supported by LM Studio)
   */
  async loadModel(modelId: string): Promise<any> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'load_model',
        arguments: { modelId },
      });

      const content = result.content?.[0]?.text;
      if (content) {
        return JSON.parse(content);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to load model ${modelId} via MCP:`, error);
      throw error;
    }
  }

  /**
   * Attempt to unload (eject) a model
   */
  async unloadModel(modelId: string): Promise<any> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'unload_model',
        arguments: { modelId },
      });

      const content = result.content?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content);
        this.logger.log(`Unload model result for ${modelId}:`, parsed);
        return parsed;
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to unload model ${modelId} via MCP:`, error);
      throw error;
    }
  }

  /**
   * Get status of a specific model
   */
  async getModelStatus(modelId: string): Promise<any> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'get_model_status',
        arguments: { modelId },
      });

      const content = result.content?.[0]?.text;
      if (content) {
        return JSON.parse(content);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to get model status for ${modelId} via MCP:`, error);
      throw error;
    }
  }

  /**
   * Send a chat request via MCP
   */
  async chat(modelId: string, messages: any[], options?: any): Promise<any> {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'chat',
        arguments: {
          modelId,
          messages,
          ...options,
        },
      });

      const content = result.content?.[0]?.text;
      if (content) {
        return JSON.parse(content);
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to chat with model ${modelId} via MCP:`, error);
      throw error;
    }
  }

  onModuleDestroy() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
  }
}

