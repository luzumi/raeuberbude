import type { LmStudioAdminConfig } from './types.js';
import { loadEnvConfig } from './env.js';

let cachedConfig: LmStudioAdminConfig | null = null;

export function getConfig(): LmStudioAdminConfig {
  if (!cachedConfig) {
    cachedConfig = loadEnvConfig();
  }
  return cachedConfig;
}

