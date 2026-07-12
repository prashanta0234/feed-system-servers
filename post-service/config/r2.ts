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


const KEY_PREFIX = (process.env.R2_KEY_PREFIX || 'images').replace(/^\/+|\/+$/g, '')

export function keyFor(id: string, filename: string): string {
  return `${KEY_PREFIX}/${id}/${filename}`
}

// R2 speaks the S3 API.
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export function publicUrl(key: string): string {
  return `${PUBLIC_BASE}/${key}`
}


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
