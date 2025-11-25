export function createStatusService(client, logger) {
    return {
        async getStatus() {
            logger.debug('StatusService.getStatus');
            const status = await client.getStatus();
            return {
                uptimeSeconds: status.uptimeSeconds,
                loadedModels: status.models.map((m) => ({
                    modelId: m.id,
                    status: m.loaded ? 'loaded' : 'unloaded',
                    activeRequests: 0,
                })),
                memoryUsageBytes: status.memoryUsageBytes,
            };
        },
    };
}
