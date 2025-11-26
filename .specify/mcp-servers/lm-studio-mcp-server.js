#!/usr/bin/env node
/**
 * LM Studio MCP Server
 *
 * Provides MCP tools to interact with LM Studio:
 * - list_models: List all loaded models
 * - load_model: Load a model into LM Studio
 * - unload_model: Unload (eject) a model from LM Studio
 * - get_model_status: Get status of a specific model
 * - chat: Send a chat request to a loaded model
 */

// LM Studio base URL from environment or default
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://192.168.56.1:1234';

// Normalize URL (remove trailing slash)
const BASE_URL = LM_STUDIO_URL.replace(/\/$/, '');

let requestId = 0;

// Fetch function - will be initialized to either global fetch or node-fetch
let fetchFn = null;
async function ensureFetch() {
  if (typeof globalThis.fetch === 'function') {
    fetchFn = globalThis.fetch.bind(globalThis);
    return;
  }
  try {
    const mod = await import('node-fetch');
    fetchFn = mod.default || mod;
  } catch (err) {
    console.error('Error: fetch not available and node-fetch could not be imported. Please run: npm install node-fetch');
    process.exit(1);
  }
}

/**
 * Fetch models from LM Studio
 */
async function listModels() {
  try {
    const response = await fetchFn(`${BASE_URL}/v1/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : data;
  } catch (error) {
    throw new Error(`Failed to list models: ${error.message}`);
  }
}

/**
 * Load a model in LM Studio using CLI
 * Uses: lms load <model-path>
 */
async function loadModel(modelId) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Try to load model via CLI
    // Note: modelId might need to be converted to full path
    const command = `lms load "${modelId}"`;

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });

      // LM Studio CLI gibt Erfolg auf stdout aus
      // Expected: "Model loaded successfully in X.XXs. (X.XX GB)"
      const successIndicators = ['loaded successfully', 'Model loaded', 'successfully'];
      const hasSuccess = successIndicators.some(indicator =>
        stdout.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasSuccess) {
        return {
          success: true,
          message: `Model ${modelId} loaded successfully`,
          output: stdout.trim(),
          command: command
        };
      }

      // Wenn stderr vorhanden und kein Success-Indikator in stdout
      if (stderr) {
        return {
          success: false,
          error: `LM Studio CLI error: ${stderr}`,
          output: stdout,
          command: command
        };
      }

      // Fallback: Wenn Output da ist, aber keine klaren Indikatoren
      return {
        success: true,
        message: `Model ${modelId} load command executed`,
        output: stdout.trim(),
        command: command
      };
    } catch (execError) {
      // Check if lms command exists
      if (execError.message.includes('not found') || execError.message.includes('not recognized')) {
        return {
          success: false,
          error: 'LM Studio CLI (lms) not found. Please ensure:\n' +
                 '1. LM Studio is installed\n' +
                 '2. lms command is in PATH\n' +
                 '3. Or load model manually in LM Studio UI',
          command: command
        };
      }

      return {
        success: false,
        error: `Failed to execute lms load: ${execError.message}`,
        command: command
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to load model: ${error.message}`
    };
  }
}

/**
 * Unload (eject) a model from LM Studio using CLI
 * Uses: lms unload <model-id>
 */
async function unloadModel(modelId) {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Try to unload model via CLI
    const command = `lms unload "${modelId}"`;

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });

      // LM Studio CLI gibt Erfolg auf stdout aus
      const successIndicators = ['unloaded successfully', 'Model unloaded', 'successfully', 'Unloaded'];
      const hasSuccess = successIndicators.some(indicator =>
        stdout.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasSuccess) {
        return {
          success: true,
          message: `Model ${modelId} unloaded successfully`,
          output: stdout.trim(),
          command: command
        };
      }

      // Wenn stderr vorhanden und kein Success-Indikator in stdout
      if (stderr) {
        return {
          success: false,
          error: `LM Studio CLI error: ${stderr}`,
          output: stdout,
          command: command
        };
      }

      // Fallback: Wenn Output da ist, aber keine klaren Indikatoren
      return {
        success: true,
        message: `Model ${modelId} unload command executed`,
        output: stdout.trim(),
        command: command
      };
    } catch (execError) {
      // Check if lms command exists
      if (execError.message.includes('not found') || execError.message.includes('not recognized')) {
        return {
          success: false,
          error: 'LM Studio CLI (lms) not found. Please ensure:\n' +
                 '1. LM Studio is installed\n' +
                 '2. lms command is in PATH\n' +
                 '3. Or eject model manually in LM Studio UI',
          command: command
        };
      }

      return {
        success: false,
        error: `Failed to execute lms unload: ${execError.message}`,
        command: command
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to unload model: ${error.message}`
    };
  }
}

/**
 * Get status of a specific model
 */
async function getModelStatus(modelId) {
  try {
    const models = await listModels();
    const model = models.find(m => m.id === modelId);

    if (!model) {
      return {
        loaded: false,
        message: `Model ${modelId} not found in loaded models`
      };
    }

    return {
      loaded: true,
      model: model
    };
  } catch (error) {
    return {
      loaded: false,
      error: `Failed to get model status: ${error.message}`
    };
  }
}

/**
 * Send a chat request to a loaded model
 */
async function chat(modelId, messages, options = {}) {
  try {
    const response = await fetchFn(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        ...options
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send chat request: ${error.message}`,
    };
  }
}

/**
 * Handle incoming JSON-RPC request
 */
async function handleRequest(request) {
  const { method, params, id } = request;

  // Handle MCP protocol initialization
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'raueberbude-llm',
          version: '1.0.0'
        }
      }
    };
  }

  // Handle tools/list request
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'list_models',
            description: 'List all loaded models in LM Studio',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'load_model',
            description: 'Load a model into LM Studio using CLI (lms load)',
            inputSchema: {
              type: 'object',
              properties: {
                modelId: { type: 'string', description: 'Model ID or path to load' }
              },
              required: ['modelId']
            }
          },
          {
            name: 'unload_model',
            description: 'Unload (eject) a model from LM Studio using CLI (lms unload)',
            inputSchema: {
              type: 'object',
              properties: {
                modelId: { type: 'string', description: 'Model ID to unload' }
              },
              required: ['modelId']
            }
          },
          {
            name: 'get_model_status',
            description: 'Get status of a specific model (check if loaded)',
            inputSchema: {
              type: 'object',
              properties: {
                modelId: { type: 'string', description: 'Model ID to check' }
              },
              required: ['modelId']
            }
          },
          {
            name: 'chat',
            description: 'Send a chat request to a loaded model',
            inputSchema: {
              type: 'object',
              properties: {
                modelId: { type: 'string', description: 'Model ID' },
                messages: { type: 'array', description: 'Chat messages' },
                options: { type: 'object', description: 'Optional parameters' }
              },
              required: ['modelId', 'messages']
            }
          }
        ]
      }
    };
  }

  if (method !== 'tools/call') {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  }

  const toolName = params?.name;
  const args = params?.arguments || {};

  let result;
  try {
    switch (toolName) {
      case 'list_models':
        result = await listModels();
        break;
      case 'load_model':
        result = await loadModel(args.modelId);
        break;
      case 'unload_model':
        result = await unloadModel(args.modelId);
        break;
      case 'get_model_status':
        result = await getModelStatus(args.modelId);
        break;
      case 'chat':
        result = await chat(args.modelId, args.messages, args.options);
        break;
      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      }
    };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message
      }
    };
  }
}

/**
 * Main: Read JSON-RPC from stdin, process, write to stdout
 */
async function main() {
  process.stdin.setEncoding('utf8');

  let buffer = '';

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;

    // Try to parse complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const request = JSON.parse(line);
        const response = await handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        console.error('Failed to parse request:', line, error);
      }
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });
}

// Check fetch availability and start main
(async () => {
  await ensureFetch();
  main();
})();

