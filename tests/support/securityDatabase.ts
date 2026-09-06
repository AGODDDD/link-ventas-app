import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

/** Real PostgreSQL execution; only Supabase-managed auth/storage services are fixtures. */
export async function securityDatabase() {
  const db = new PGlite()
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE PUBLICATION supabase_realtime;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt()->>'sub', '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner_id text, metadata jsonb, created_at timestamptz DEFAULT now(), UNIQUE(bucket_id,name));
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1] $$;
    GRANT USAGE ON SCHEMA public, storage TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
  `)
  const directory = new URL('../../supabase/migrations/', import.meta.url)
  for (const file of readdirSync(directory).filter(file => file.endsWith('.sql')).sort()) {
    // PGlite has built-in gen_random_uuid; it does not ship the pgcrypto extension.
    const sql = readFileSync(new URL(file, directory), 'utf8').replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/gi, '')
    try { await db.exec(sql) } catch (error) {
      await db.close()
      throw new Error(`Migration ${file}: ${(error as Error).message}`)
    }
  }
  return db
}
