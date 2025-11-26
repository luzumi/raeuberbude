import { spawn } from 'child_process';
function runCli(config, logger, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(config.command, [...(config.defaultArgs ?? []), ...args], {
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('error', (err) => {
            logger.error('CLI-Prozessfehler', { err });
            reject(err);
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            }
            else {
                const err = new Error(`CLI-Befehl fehlgeschlagen (Exit-Code ${code}): ${stderr}`);
                logger.error('CLI-Befehl fehlgeschlagen', { code, stderr });
                reject(err);
            }
        });
        // Einfache Timeout-Implementierung
        if (config.timeoutMs > 0) {
            setTimeout(() => {
                logger.error('CLI-Befehl Timeout', { args });
                child.kill('SIGKILL');
                reject(new Error('CLI-Befehl Timeout'));
            }, config.timeoutMs).unref();
        }
    });
}
export function createLmStudioCliClient(config, logger) {
    return {
        async listModels() {
            logger.debug('CLI: listModels');
            if (!config.enabled)
                return [];
            // TODO: echten CLI-Befehl und Parsing ergänzen
            await runCli(config, logger, ['list-models']);
            return [];
        },
        async loadModel(id) {
            logger.debug('CLI: loadModel', { id });
            if (!config.enabled)
                return;
            await runCli(config, logger, ['load', id]);
        },
        async unloadModel(id) {
            logger.debug('CLI: unloadModel', { id });
            if (!config.enabled)
                return;
            await runCli(config, logger, ['unload', id]);
        },
        async getServerConfig() {
            logger.debug('CLI: getServerConfig');
            if (!config.enabled) {
                return { ttlSeconds: 0, autoEvict: false };
            }
            await runCli(config, logger, ['get-config']);
            return { ttlSeconds: 0, autoEvict: false };
        },
        async updateServerConfig(configPatch) {
            logger.debug('CLI: updateServerConfig', { configPatch });
            if (!config.enabled) {
                return { ttlSeconds: 0, autoEvict: false };
            }
            // TODO: echten CLI-Befehl und Parameter-Erzeugung
            await runCli(config, logger, ['set-config']);
            return { ttlSeconds: 0, autoEvict: false };
        },
        async getStatus() {
            logger.debug('CLI: getStatus');
            if (!config.enabled) {
                return { uptimeSeconds: 0, models: [] };
            }
            await runCli(config, logger, ['status']);
            return { uptimeSeconds: 0, models: [] };
        },
        async listTrainingJobs() {
            logger.debug('CLI: listTrainingJobs');
            if (!config.enabled)
                return [];
            await runCli(config, logger, ['list-training']);
            return [];
        },
    };
}
