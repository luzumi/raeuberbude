export function createLogger(config) {
    const levels = {
        debug: 10,
        info: 20,
        warn: 30,
        error: 40,
    };
    const minLevel = levels[config.logLevel] ?? levels.info;
    function log(level, msg, meta) {
        if (levels[level] < minLevel)
            return;
        const entry = {
            ts: new Date().toISOString(),
            level,
            msg,
            meta,
        };
        // Für den Anfang auf stdout loggen
        // Später kann hier Mongo/REST-Logging angebunden werden
        console.log(JSON.stringify(entry));
    }
    return {
        debug: (msg, meta) => log('debug', msg, meta),
        info: (msg, meta) => log('info', msg, meta),
        warn: (msg, meta) => log('warn', msg, meta),
        error: (msg, meta) => log('error', msg, meta),
    };
}
