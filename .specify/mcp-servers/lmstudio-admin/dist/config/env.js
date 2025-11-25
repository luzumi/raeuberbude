function getEnv(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        if (defaultValue !== undefined)
            return defaultValue;
        throw new Error(`Umgebungsvariable ${name} ist nicht gesetzt`);
    }
    return value;
}
function getEnvNumber(name, defaultValue) {
    const raw = process.env[name];
    if (!raw)
        return defaultValue;
    const num = Number(raw);
    if (Number.isNaN(num)) {
        throw new Error(`Umgebungsvariable ${name} ist keine gültige Zahl: ${raw}`);
    }
    return num;
}
function getEnvBool(name, defaultValue) {
    const raw = process.env[name];
    if (!raw)
        return defaultValue;
    return raw === '1' || raw.toLowerCase() === 'true';
}
export function loadEnvConfig() {
    const restPort = getEnvNumber('LMSTUDIO_ADMIN_REST_PORT', 4310);
    const restHost = getEnv('LMSTUDIO_ADMIN_REST_HOST', '127.0.0.1');
    const baseUrl = getEnv('LMSTUDIO_HTTP_BASE_URL', 'http://127.0.0.1:1234');
    const apiKey = process.env['LMSTUDIO_HTTP_API_KEY'];
    const httpTimeout = getEnvNumber('LMSTUDIO_HTTP_TIMEOUT_MS', 10000);
    const cliEnabled = getEnvBool('LMSTUDIO_CLI_ENABLED', false);
    const cliCommand = getEnv('LMSTUDIO_CLI_COMMAND', 'lms');
    const cliTimeout = getEnvNumber('LMSTUDIO_CLI_TIMEOUT_MS', 15000);
    const logLevel = getEnv('LMSTUDIO_ADMIN_LOG_LEVEL', 'info');
    return {
        rest: {
            port: restPort,
            host: restHost,
        },
        lmstudioHttp: {
            baseUrl,
            apiKey,
            timeoutMs: httpTimeout,
        },
        lmstudioCli: {
            enabled: cliEnabled,
            command: cliCommand,
            timeoutMs: cliTimeout,
        },
        logLevel,
    };
}
