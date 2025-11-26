export function createMcpServer(deps) {
    // Hier wird später das konkrete MCP-Server-SDK integriert.
    // Für das Grundgerüst starten wir nur einen Stub.
    return {
        async start() {
            deps.logger.info('MCP-Server Stub gestartet (noch ohne echte Implementierung)');
            // TODO: MCP-SDK integrieren und Tools/Handler registrieren
        },
    };
}
