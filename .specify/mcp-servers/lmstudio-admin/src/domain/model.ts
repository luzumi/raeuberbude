export type LmModelStatus = 'loaded' | 'unloaded' | 'loading' | 'failed';

export interface LmModel {
  id: string;
  name: string;
  description?: string;
  status: LmModelStatus;
  sizeBytes?: number;
  loadedSince?: string;
}

