export function createModelService(client, logger) {
    return {
        async listModels() {
            logger.debug('ModelService.listModels');
            const models = await client.listModels();
            // TODO: Mapping von Infra-Model auf Domain-LmModel
            return models.map((m) => ({
                id: m.id,
                name: m.name,
                status: m.loaded ? 'loaded' : 'unloaded',
            }));
        },
        async loadModel(id) {
            logger.info('ModelService.loadModel', { id });
            await client.loadModel(id);
            // TODO: optional aktualisierten Status zurückgeben
            return null;
        },
        async unloadModel(id) {
            logger.info('ModelService.unloadModel', { id });
            await client.unloadModel(id);
            // TODO: optional aktualisierten Status zurückgeben
            return null;
        },
    };
}
