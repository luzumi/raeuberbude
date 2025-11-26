import { createLmStudioHttpClient } from './lmstudioHttpClient.js';
import { createLmStudioCliClient } from './lmstudioCliClient.js';
export function createLmStudioClient(config, logger) {
    const httpClient = createLmStudioHttpClient(config.lmstudioHttp, logger);
    const cliClient = createLmStudioCliClient(config.lmstudioCli, logger);
    async function withFallback(fnHttp, fnCli) {
        try {
            return await fnHttp();
        }
        catch (err) {
            logger.warn('HTTP-Aufruf fehlgeschlagen, versuche CLI-Fallback', { err });
            return fnCli();
        }
    }
    return {
        listModels() {
            return withFallback(() => httpClient.listModels(), () => cliClient.listModels());
        },
        loadModel(id) {
            return withFallback(() => httpClient.loadModel(id), () => cliClient.loadModel(id));
        },
        unloadModel(id) {
            return withFallback(() => httpClient.unloadModel(id), () => cliClient.unloadModel(id));
        },
        getServerConfig() {
            return withFallback(() => httpClient.getServerConfig(), () => cliClient.getServerConfig());
        },
        updateServerConfig(configPatch) {
            return withFallback(() => httpClient.updateServerConfig(configPatch), () => cliClient.updateServerConfig(configPatch));
        },
        getStatus() {
            return withFallback(() => httpClient.getStatus(), () => cliClient.getStatus());
        },
        listTrainingJobs() {
            return withFallback(() => httpClient.listTrainingJobs(), () => cliClient.listTrainingJobs());
        },
    };
}
