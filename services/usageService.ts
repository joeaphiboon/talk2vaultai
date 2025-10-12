export interface UsageSnapshot {
  requestCount: number;
  tokenCount: number;
}

type Listener = (usage: UsageSnapshot) => void;

let usage: UsageSnapshot = {
  requestCount: 0,
  tokenCount: 0,
};

const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => listener({ ...usage }));
};

export const incrementRequestCount = () => {
  usage = {
    ...usage,
    requestCount: usage.requestCount + 1,
  };
  notify();
};

export const addTokenUsage = (tokens: number) => {
  if (!Number.isFinite(tokens) || tokens <= 0) {
    return;
  }
  usage = {
    ...usage,
    tokenCount: usage.tokenCount + Math.floor(tokens),
  };
  notify();
};

export const resetUsage = () => {
  usage = {
    requestCount: 0,
    tokenCount: 0,
  };
  notify();
};

export const getUsageSnapshot = (): UsageSnapshot => ({ ...usage });

export const subscribeToUsage = (listener: Listener) => {
  listeners.add(listener);
  listener({ ...usage });
  return () => {
    listeners.delete(listener);
  };
};
