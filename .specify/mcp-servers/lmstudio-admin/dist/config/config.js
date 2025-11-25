import { loadEnvConfig } from './env.js';
let cachedConfig = null;
export function getConfig() {
    if (!cachedConfig) {
        cachedConfig = loadEnvConfig();
    }
    return cachedConfig;
}
