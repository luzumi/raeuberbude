export interface LmStudioHttpConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface LmStudioCliConfig {
  enabled: boolean;
  command: string;
  defaultArgs?: string[];
  timeoutMs: number;
}

export interface RestServerConfig {
  port: number;
  host: string;
}

export interface LmStudioAdminConfig {
  rest: RestServerConfig;
  lmstudioHttp: LmStudioHttpConfig;
  lmstudioCli: LmStudioCliConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

