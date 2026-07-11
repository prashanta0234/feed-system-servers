import { Pool, type PoolConfig, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'

const poolOpts: PoolConfig = {
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}


function connConfig(prefix: string): PoolConfig | null {
  const host = process.env[`${prefix}_HOST`]
  if (!host) return null
  return {
    host: host.trim(),
    user: process.env[`${prefix}_USER`] || process.env.DB_USER,
    password: process.env[`${prefix}_PASSWORD`] || process.env.DB_PASSWORD,
    database: process.env[`${prefix}_NAME`] || process.env.DB_NAME,
    port: Number(process.env[`${prefix}_PORT`] || process.env.DB_PORT || 5432),
  }
}

const masterConfig = connConfig('DB_MASTER')
if (!masterConfig) {
  throw new Error('[db] DB_MASTER_HOST is not set')
}


const replicaConfigs = Object.keys(process.env)
  .filter((k) => /^DB_REPLICA_\d+_HOST$/.test(k))
  .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
  .map((k) => connConfig(k.replace(/_HOST$/, '')))
  .filter((cfg): cfg is PoolConfig => cfg !== null)

const master = new Pool({ ...masterConfig, ...poolOpts })
const replicas = replicaConfigs.map((cfg) => new Pool({ ...cfg, ...poolOpts }))

master.on('error', (err) => console.error('[db] master pool error:', err.message))
replicas.forEach((pool, i) =>
  pool.on('error', (err) => console.error(`[db] replica #${i} pool error:`, err.message)),
)

console.log(`[db] master + ${replicas.length} replica(s) ready`)

// round-robin picker
let rr = 0
function nextReplica(): Pool {
  const pool = replicas[rr % replicas.length]
  rr = (rr + 1) % replicas.length
  return pool
}

type Params = ReadonlyArray<unknown>

// for every write
function write<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  return master.query<R>(text, params as unknown[])
}


// for every read
async function read<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  if (replicas.length === 0) return master.query<R>(text, params as unknown[])
  const pool = nextReplica()
  try {
    return await pool.query<R>(text, params as unknown[])
  } catch (err) {
    console.error('[db] replica read failed, falling back to master:', (err as Error).message)
    return master.query<R>(text, params as unknown[])
  }
}

// when we need read after write
function strong<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  return master.query<R>(text, params as unknown[])
}

// for transactions (read/write)
async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await master.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function end(): Promise<void> {
  await Promise.allSettled([master.end(), ...replicas.map((p) => p.end())])
}

export { write, read, strong, tx, end, master, replicas }
export default { write, read, strong, tx, end, master, replicas }
