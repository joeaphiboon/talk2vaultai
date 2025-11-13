
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Settings {
  apiKey: string;
  vaultSource: 'local';
  model: string;
}

export interface VaultFile {
  name: string;
  content: string;
}

export interface UsageStatus {
  rateLimit: {
    limit: number;
    remaining: number;
    retryAfter?: number;
  };
  quota: {
    type: 'guest' | 'user';
    mode: 'count' | 'window';
    total?: number;
    used?: number;
    remaining?: number;
    windowMinutes?: number;
    windowRemainingSeconds?: number;
  };
}
