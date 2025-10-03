
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
