export function registerTrainingRoutes(app, deps, logger) {
    app.get('/api/training/jobs', async (_req, res) => {
        try {
            const jobs = await deps.trainingService.listTrainingJobs();
            res.json(jobs);
        }
        catch (err) {
            logger.error('Fehler bei GET /api/training/jobs', { err });
            res.status(500).json({ error: 'INTERNAL_ERROR' });
        }
    });
}
