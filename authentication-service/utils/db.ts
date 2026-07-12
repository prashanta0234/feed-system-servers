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

// query logging: on by default, disable with DB_LOG=false
const DB_LOG = process.env.DB_LOG !== 'false'

interface Queryable {
  query<R extends QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>>
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

async function runQuery<R extends QueryResultRow>(
  q: Queryable,
  label: string,
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  const start = performance.now()
  try {
    const result = await q.query<R>(text, params as unknown[])
    if (DB_LOG) {
      const ms = (performance.now() - start).toFixed(1)
      const args = params && params.length ? ` -- ${JSON.stringify(params)}` : ''
      console.log(`[db:${label}] ${oneLine(text)}${args} -> ${result.rowCount} row(s) in ${ms}ms`)
    }
    return result
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1)
    const args = params && params.length ? ` -- ${JSON.stringify(params)}` : ''
    console.error(`[db:${label}] FAILED ${oneLine(text)}${args} after ${ms}ms:`, (err as Error).message)
    throw err
  }
}

// for every write
function write<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  return runQuery<R>(master, 'write', text, params)
}


// for every read
async function read<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  if (replicas.length === 0) return runQuery<R>(master, 'read', text, params)
  const pool = nextReplica()
  try {
    return await runQuery<R>(pool, 'read', text, params)
  } catch (err) {
    console.error('[db] replica read failed, falling back to master:', (err as Error).message)
    return runQuery<R>(master, 'read-fallback', text, params)
  }
}

// when we need read after write
function strong<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: Params,
): Promise<QueryResult<R>> {
  return runQuery<R>(master, 'strong', text, params)
}

// for transactions (read/write)
async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await master.connect()
  // wrap so queries issued inside the transaction are logged too
  const logged: PoolClient = new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'query') {
        return (text: string, params?: Params) => runQuery(target, 'tx', text, params)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
  try {
    await runQuery(client, 'tx', 'BEGIN')
    const result = await fn(logged)
    await runQuery(client, 'tx', 'COMMIT')
    return result
  } catch (err) {
    await runQuery(client, 'tx', 'ROLLBACK')
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
