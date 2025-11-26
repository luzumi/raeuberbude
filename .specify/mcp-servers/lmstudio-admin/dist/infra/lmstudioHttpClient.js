import axios from 'axios';
export function createLmStudioHttpClient(config, logger) {
    const client = axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeoutMs,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
    });
    // Hinweis: Die konkreten Pfade/Antwortstrukturen der LM Studio API
    // müssen noch an die reale Doku angepasst werden. Hier wird nur das
    // Interface vorbereitet.
    return {
        async listModels() {
            logger.debug('HTTP: listModels');
            // ...später implementieren
            return [];
        },
        async loadModel(id) {
            logger.debug('HTTP: loadModel', { id });
            // ...später implementieren
        },
        async unloadModel(id) {
            logger.debug('HTTP: unloadModel', { id });
            // ...später implementieren
        },
        async getServerConfig() {
            logger.debug('HTTP: getServerConfig');
            // ...später implementieren
            return { ttlSeconds: 0, autoEvict: false };
        },
        async updateServerConfig(configPatch) {
            logger.debug('HTTP: updateServerConfig', { configPatch });
            // ...später implementieren
            return { ttlSeconds: 0, autoEvict: false };
        },
        async getStatus() {
            logger.debug('HTTP: getStatus');
            // ...später implementieren
            return { uptimeSeconds: 0, models: [] };
        },
        async listTrainingJobs() {
            logger.debug('HTTP: listTrainingJobs');
            // ...später implementieren
            return [];
        },
    };
}
