export type TrainingJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface TrainingJob {
  id: string;
  modelId: string;
  status: TrainingJobStatus;
  progressPercent?: number;
  startedAt?: string;
  finishedAt?: string;
}

