export interface LmServerEvictionPolicy {
  ttlSeconds: number;
  autoEvict: boolean;
  maxLoadedModels?: number;
}

export interface LmServerConfig {
  eviction: LmServerEvictionPolicy;
}

