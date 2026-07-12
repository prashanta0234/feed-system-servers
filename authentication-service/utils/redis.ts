import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB || 0),
})

redis.on('connect', () => console.log('[redis] connected'))
redis.on('error', (err) => console.error('[redis] error:', err.message))

export default redis
