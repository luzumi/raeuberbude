export function registerModelsRoutes(app, deps, logger) {
    app.get('/api/models', async (_req, res) => {
        try {
            const models = await deps.modelService.listModels();
            res.json(models);
        }
        catch (err) {
            logger.error('Fehler bei GET /api/models', { err });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
    app.post('/api/models/:id/load', async (req, res) => {
        const id = req.params.id;
        try {
            await deps.modelService.loadModel(id);
            res.status(202).json({ status: 'loading', id });
        }
        catch (err) {
            logger.error('Fehler bei POST /api/models/:id/load', { err, id });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
    app.post('/api/models/:id/unload', async (req, res) => {
        const id = req.params.id;
        try {
            await deps.modelService.unloadModel(id);
            res.status(202).json({ status: 'unloading', id });
        }
        catch (err) {
            logger.error('Fehler bei POST /api/models/:id/unload', { err, id });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
}
