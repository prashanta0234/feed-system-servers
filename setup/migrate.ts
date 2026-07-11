import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Client } from 'pg'


const dir = fileURLToPath(new URL('./migrations/', import.meta.url))

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
})

async function run() {
  await client.connect()
  console.log(`[migrate] connected to master ${client.host}:${client.port}/${client.database}`)

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const done = new Set(
    (await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
      (r) => r.name,
    ),
  )

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const pending = files.filter((f) => !done.has(f))

  if (pending.length === 0) {
    console.log('[migrate] nothing to apply, database is up to date')
    return
  }

  for (const file of pending) {
    const sql = await readFile(path.join(dir, file), 'utf8')
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`[migrate] ✓ applied ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`[migrate] ✗ failed ${file}:`, (err as Error).message)
      process.exitCode = 1
      break
    }
  }
}

run()
  .catch((err) => {
    console.error('[migrate] fatal:', (err as Error).message)
    process.exitCode = 1
  })
  .finally(() => client.end())
