export function registerStatusRoutes(app, deps, logger) {
    app.get('/api/status', async (_req, res) => {
        try {
            const status = await deps.statusService.getStatus();
            res.json(status);
        }
        catch (err) {
            logger.error('Fehler bei GET /api/status', { err });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
}
