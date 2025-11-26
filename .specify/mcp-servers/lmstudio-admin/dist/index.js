// Einstiegspunkt für LM Studio MCP-Adminserver
import { getConfig } from './config/config.js';
import { createLogger } from './logging/logger.js';
import { createLmStudioClient } from './infra/lmstudioClientFactory.js';
import { createModelService } from './services/modelService.js';
import { createConfigService } from './services/configService.js';
import { createStatusService } from './services/statusService.js';
import { createTrainingService } from './services/trainingService.js';
import { createRestServer } from './transport/rest/restServer.js';
import { createMcpServer } from './transport/mcp/mcpServer.js';
async function main() {
    const config = getConfig();
    const logger = createLogger(config);
    logger.info('LM Studio Admin MCP-Server startet...', { config });
    const lmClient = createLmStudioClient(config, logger);
    const modelService = createModelService(lmClient, logger);
    const configService = createConfigService(lmClient, logger);
    const statusService = createStatusService(lmClient, logger);
    const trainingService = createTrainingService(lmClient, logger);
    const restServer = createRestServer({
        config,
        logger,
        modelService,
        configService,
        statusService,
        trainingService,
    });
    const mcpServer = createMcpServer({
        config,
        logger,
        modelService,
        configService,
        statusService,
        trainingService,
    });
    await Promise.all([
        restServer.start(),
        mcpServer.start(),
    ]);
}
main().catch((err) => {
    console.error('Fataler Fehler im MCP-Adminserver', err);
    process.exit(1);
});
