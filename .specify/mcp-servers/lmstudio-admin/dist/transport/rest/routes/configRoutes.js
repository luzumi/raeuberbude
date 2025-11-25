export function registerConfigRoutes(app, deps, logger) {
    app.get('/api/config/llm', async (_req, res) => {
        try {
            const cfg = await deps.configService.getServerConfig();
            res.json(cfg);
        }
        catch (err) {
            logger.error('Fehler bei GET /api/config/llm', { err });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
    app.put('/api/config/llm', async (req, res) => {
        try {
            const updated = await deps.configService.updateServerConfig(req.body ?? {});
            res.json(updated);
        }
        catch (err) {
            logger.error('Fehler bei PUT /api/config/llm', { err });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
}
