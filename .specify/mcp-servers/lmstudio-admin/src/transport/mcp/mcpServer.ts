import type { Logger } from '../../logging/logger.js';
import type { LmStudioAdminConfig } from '../../config/types.js';
import type { ModelService } from '../../services/modelService.js';
import type { ConfigService } from '../../services/configService.js';
import type { StatusService } from '../../services/statusService.js';
import type { TrainingService } from '../../services/trainingService.js';

export interface McpServerDeps {
  config: LmStudioAdminConfig;
  logger: Logger;
  modelService: ModelService;
  configService: ConfigService;
  statusService: StatusService;
  trainingService: TrainingService;
}

export interface McpServer {
  start(): Promise<void>;
}

export function createMcpServer(deps: McpServerDeps): McpServer {
  // Hier wird später das konkrete MCP-Server-SDK integriert.
  // Für das Grundgerüst starten wir nur einen Stub.

  return {
    async start() {
      deps.logger.info('MCP-Server Stub gestartet (noch ohne echte Implementierung)');
      // TODO: MCP-SDK integrieren und Tools/Handler registrieren
    },
  };
}

