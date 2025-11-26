export function createConfigService(client, logger) {
    return {
        async getServerConfig() {
            logger.debug('ConfigService.getServerConfig');
            const cfg = await client.getServerConfig();
            return {
                eviction: {
                    ttlSeconds: cfg.ttlSeconds,
                    autoEvict: cfg.autoEvict,
                    maxLoadedModels: cfg.maxLoadedModels,
                },
            };
        },
        async updateServerConfig(partial) {
            logger.info('ConfigService.updateServerConfig', { partial });
            const patch = {}; // wird gleich befüllt
            // TODO: saubere Validierung und Feldmapping
            if (partial.eviction?.ttlSeconds !== undefined) {
                patch.ttlSeconds = partial.eviction.ttlSeconds;
            }
            if (partial.eviction?.autoEvict !== undefined) {
                patch.autoEvict = partial.eviction.autoEvict;
            }
            if (partial.eviction?.maxLoadedModels !== undefined) {
                patch.maxLoadedModels = partial.eviction.maxLoadedModels;
            }
            const updated = await client.updateServerConfig(patch);
            return {
                eviction: {
                    ttlSeconds: updated.ttlSeconds,
                    autoEvict: updated.autoEvict,
                    maxLoadedModels: updated.maxLoadedModels,
                },
            };
        },
    };
}
