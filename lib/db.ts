import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

function getConnectionString(): string {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    return u.toString();
  } catch {
    return raw.includes('sslmode=') ? raw : raw + (raw.includes('?') ? '&' : '?') + 'sslmode=require';
  }
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error('Database URL missing');
  // For Supabase, require SSL; rejectUnauthorized false to allow platform certs
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  return pool;
}

// Tagged template helper that parameterizes inputs: sql`select * from t where id=${id}`
export async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult<any>> {
  const textParts: string[] = [];
  const params: any[] = [];
  strings.forEach((s, i) => {
    textParts.push(s);
    if (i < values.length) {
      params.push(values[i]);
      textParts.push(`$${params.length}`);
    }
  });
  const text = textParts.join('');
  const client: PoolClient = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
