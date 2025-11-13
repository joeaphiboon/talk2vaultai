import { UsageStatus } from '../types';

export async function fetchUsageStatus(): Promise<UsageStatus> {
  const res = await fetch('/api/proxy/usage', { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch usage: ${res.status}`);
  return res.json();
}
