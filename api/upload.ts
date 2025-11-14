import type { IncomingMessage, ServerResponse } from 'http';
import { Pool, PoolClient, QueryResult } from 'pg';
import formidable from 'formidable';
import fs from 'fs';

// Database module inlined
let pool: Pool | null = null;

function getConnectionString(): string {
  const raw = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'disable');
    return u.toString();
  } catch {
    return raw.includes('sslmode=') ? raw : raw + (raw.includes('?') ? '&' : '?') + 'sslmode=disable';
  }
}

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error('Database URL missing');
  pool = new Pool({ connectionString, ssl: false });
  return pool;
}

async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<QueryResult<any>> {
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

export const config = { runtime: 'nodejs20.x', api: { bodyParser: false } } as const;

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers['cookie'];
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, v] = part.split('=');
    if (!k) continue;
    out[k.trim()] = decodeURIComponent((v || '').trim());
  }
  return out;
}

function newGuestId(): string {
  return crypto.randomUUID();
}

function setGuestCookie(res: ServerResponse, value: string) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  const cookie = `guest_id=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
  res.setHeader('Set-Cookie', cookie);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Identify guest
  const cookies = parseCookies(req);
  let guestId = cookies['guest_id'];
  if (!guestId) {
    guestId = newGuestId();
    setGuestCookie(res, guestId);
  }

  // Ensure schema
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "GuestVault" (
        guest_id TEXT PRIMARY KEY,
        vault_content TEXT
      );
    `;
  } catch (e) {
    console.error('Schema ensure error:', e);
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ message: 'File upload failed' });
    }

    let vaultContent = '';

    // Process files
    const fileList = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
    for (const file of fileList) {
      if (file && file.filepath && file.originalFilename?.endsWith('.md')) {
        try {
          const content = fs.readFileSync(file.filepath, 'utf8');
          vaultContent += `\n--- ${file.originalFilename} ---\n${content}`;
        } catch (e) {
          console.error('Error reading file:', file.originalFilename, e);
        }
      }
    }

    if (vaultContent) {
      try {
        await sql`
          INSERT INTO "GuestVault" (guest_id, vault_content)
          VALUES (${guestId}, ${vaultContent})
          ON CONFLICT (guest_id)
          DO UPDATE SET vault_content = EXCLUDED.vault_content;
        `;
        console.log(`Stored vault for guest ${guestId}, length: ${vaultContent.length}`);
        return res.status(200).json({ message: 'Vault uploaded successfully', files: fileList.length });
      } catch (e) {
        console.error('DB insert error:', e);
        return res.status(500).json({ message: 'Database error' });
      }
    } else {
      return res.status(400).json({ message: 'No valid .md files found' });
    }
  });
}