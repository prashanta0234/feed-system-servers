import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import type { Readable } from 'stream'

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error('[r2] missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET')
}
if (!R2_PUBLIC_URL) {
  throw new Error('[r2] R2_PUBLIC_URL is not set (bucket public URL or custom domain)')
}

const BUCKET = R2_BUCKET
const PUBLIC_BASE = R2_PUBLIC_URL.replace(/\/+$/, '')

// The "folder" inside the bucket that every image lives under. One place to
// change it; strip any leading/trailing slashes so joins are clean.
const KEY_PREFIX = (process.env.R2_KEY_PREFIX || 'images').replace(/^\/+|\/+$/g, '')

/** Build an object key: `<prefix>/<id>/<filename>` (e.g. images/01J.../original.jpg). */
export function keyFor(id: string, filename: string): string {
  return `${KEY_PREFIX}/${id}/${filename}`
}

// R2 speaks the S3 API. Region must be "auto".
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

/** Public URL for a stored object key. */
export function publicUrl(key: string): string {
  return `${PUBLIC_BASE}/${key}`
}

/**
 * Stream/buffer a body to R2. Uses lib-storage's Upload so Node streams are
 * sent as a multipart upload without buffering the whole thing in memory.
 */
export async function put(
  key: string,
  body: Readable | Buffer,
  contentType: string,
): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  })
  await upload.done()
  return key
}

/** Fetch an object's bytes back from R2 (used by the worker to read the original). */
export async function getBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const body = res.Body as Readable
  const chunks: Buffer[] = []
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export { s3, BUCKET, KEY_PREFIX }
export default { publicUrl, put, getBuffer, keyFor, s3, BUCKET, KEY_PREFIX }
