import redis from '../../utils/redis.js'

export type ImageStatus = 'uploaded' | 'processing' | 'processed' | 'failed'

export interface ImageRecord {
  id: string
  status: ImageStatus
  temp: boolean
  owner: string
  key: string
  url: string
  mime: string
  size: number
  variants?: { full?: string; thumb?: string }
  width?: number
  height?: number
  error?: string
  createdAt: number
  updatedAt: number
}


const TEMP_TTL_SECONDS = Number(process.env.IMAGE_TEMP_TTL || 60 * 60) // 1h
const keyFor = (id: string) => `image:${id}`

export async function create(
  rec: Pick<ImageRecord, 'id' | 'owner' | 'key' | 'url' | 'mime' | 'size'>,
): Promise<void> {
  const now = Date.now()
  const k = keyFor(rec.id)
  await redis
    .multi()
    .hset(k, {
      id: rec.id,
      status: 'uploaded' satisfies ImageStatus,
      temp: '1',
      owner: rec.owner,
      key: rec.key,
      url: rec.url,
      mime: rec.mime,
      size: String(rec.size),
      createdAt: String(now),
      updatedAt: String(now),
    })
    .expire(k, TEMP_TTL_SECONDS)
    .exec()
}

export async function patch(
  id: string,
  fields: Partial<Pick<ImageRecord, 'status' | 'variants' | 'width' | 'height' | 'error'>>,
): Promise<void> {
  const flat: Record<string, string> = { updatedAt: String(Date.now()) }
  if (fields.status) flat.status = fields.status
  if (fields.width != null) flat.width = String(fields.width)
  if (fields.height != null) flat.height = String(fields.height)
  if (fields.error != null) flat.error = fields.error
  if (fields.variants) flat.variants = JSON.stringify(fields.variants)
  await redis.hset(keyFor(id), flat)
}


export async function claim(id: string): Promise<boolean> {
  const k = keyFor(id)
  if ((await redis.exists(k)) === 0) return false
  await redis.multi().hset(k, { temp: '0', updatedAt: String(Date.now()) }).persist(k).exec()
  return true
}

export async function get(id: string): Promise<ImageRecord | null> {
  const h = await redis.hgetall(keyFor(id))
  if (!h || !h.id) return null
  return {
    id: h.id,
    status: h.status as ImageStatus,
    temp: h.temp === '1',
    owner: h.owner,
    key: h.key,
    url: h.url,
    mime: h.mime,
    size: Number(h.size),
    variants: h.variants ? JSON.parse(h.variants) : undefined,
    width: h.width ? Number(h.width) : undefined,
    height: h.height ? Number(h.height) : undefined,
    error: h.error || undefined,
    createdAt: Number(h.createdAt),
    updatedAt: Number(h.updatedAt),
  }
}

export default { create, patch, claim, get }
