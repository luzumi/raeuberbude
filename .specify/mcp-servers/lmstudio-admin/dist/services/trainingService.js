export function createTrainingService(client, logger) {
    return {
        async listTrainingJobs() {
            logger.debug('TrainingService.listTrainingJobs');
            const jobs = await client.listTrainingJobs();
            return jobs.map((j) => ({
                id: j.id,
                modelId: j.modelId,
                status: j.status,
                progressPercent: j.progress,
            }));
        },
    };
}
