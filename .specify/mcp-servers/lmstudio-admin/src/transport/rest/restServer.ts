import express, { type Express } from 'express';
import type { LmStudioAdminConfig } from '../../config/types.js';
import type { Logger } from '../../logging/logger.js';
import type { ModelService } from '../../services/modelService.js';
import type { ConfigService } from '../../services/configService.js';
import type { StatusService } from '../../services/statusService.js';
import type { TrainingService } from '../../services/trainingService.js';
import { registerModelsRoutes } from './routes/modelsRoutes.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerStatusRoutes } from './routes/statusRoutes.js';
import { registerTrainingRoutes } from './routes/trainingRoutes.js';

export interface RestServerDeps {
  config: LmStudioAdminConfig;
  logger: Logger;
  modelService: ModelService;
  configService: ConfigService;
  statusService: StatusService;
  trainingService: TrainingService;
}

export interface RestServer {
  start(): Promise<void>;
}

export function createRestServer(deps: RestServerDeps): RestServer {
  const app: Express = express();
  app.use(express.json());

  registerModelsRoutes(app, { modelService: deps.modelService }, deps.logger);
  registerConfigRoutes(app, { configService: deps.configService }, deps.logger);
  registerStatusRoutes(app, { statusService: deps.statusService }, deps.logger);
  registerTrainingRoutes(app, { trainingService: deps.trainingService }, deps.logger);

  return {
    async start() {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(deps.config.rest.port, deps.config.rest.host, () => {
          deps.logger.info('REST-Server gestartet', {
            port: deps.config.rest.port,
            host: deps.config.rest.host,
          });
          resolve();
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            deps.logger.error('REST-Server-Port bereits belegt', {
              port: deps.config.rest.port,
              host: deps.config.rest.host,
            });
          }
          reject(err);
        });
      });
    },
  };
}
