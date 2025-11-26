import express from 'express';
import { registerModelsRoutes } from './routes/modelsRoutes.js';
import { registerConfigRoutes } from './routes/configRoutes.js';
import { registerStatusRoutes } from './routes/statusRoutes.js';
import { registerTrainingRoutes } from './routes/trainingRoutes.js';
export function createRestServer(deps) {
    const app = express();
    app.use(express.json());
    registerModelsRoutes(app, { modelService: deps.modelService }, deps.logger);
    registerConfigRoutes(app, { configService: deps.configService }, deps.logger);
    registerStatusRoutes(app, { statusService: deps.statusService }, deps.logger);
    registerTrainingRoutes(app, { trainingService: deps.trainingService }, deps.logger);
    return {
        async start() {
            await new Promise((resolve) => {
                app.listen(deps.config.rest.port, deps.config.rest.host, () => {
                    deps.logger.info('REST-Server gestartet', {
                        port: deps.config.rest.port,
                        host: deps.config.rest.host,
                    });
                    resolve();
                });
            });
        },
    };
}
