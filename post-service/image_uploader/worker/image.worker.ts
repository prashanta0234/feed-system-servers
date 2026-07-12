import { Worker, type Job } from 'bullmq'
import sharp from 'sharp'
import { IMAGE_QUEUE, connection, type ProcessJob } from '../service/queue.service.js'
import { getBuffer, put, publicUrl, keyFor } from '../../config/r2.js'
import * as status from '../service/status.service.js'

const CONCURRENCY = Number(process.env.IMAGE_WORKER_CONCURRENCY || 4)
const FULL_WIDTH = Number(process.env.IMAGE_FULL_WIDTH || 1600)
const THUMB_WIDTH = Number(process.env.IMAGE_THUMB_WIDTH || 320)

async function processImage(job: Job<ProcessJob>): Promise<void> {
  const { id, key } = job.data
  await status.patch(id, { status: 'processing' })

  const original = await getBuffer(key)

  // Compressed full-size webp 
  const fullBuf = await sharp(original)
    .rotate()
    .resize({ width: FULL_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true })

  // Small thumbnail.
  const thumbBuf = await sharp(original)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer()

  const fullKey = keyFor(id, 'full.webp')
  const thumbKey = keyFor(id, 'thumb.webp')
  await Promise.all([
    put(fullKey, fullBuf.data, 'image/webp'),
    put(thumbKey, thumbBuf, 'image/webp'),
  ])

  await status.patch(id, {
    status: 'processed',
    width: fullBuf.info.width,
    height: fullBuf.info.height,
    variants: { full: publicUrl(fullKey), thumb: publicUrl(thumbKey) },
  })
}

const worker = new Worker<ProcessJob>(IMAGE_QUEUE, processImage, { connection, concurrency: CONCURRENCY })

worker.on('ready', () => console.log(`[worker] listening on "${IMAGE_QUEUE}" (concurrency ${CONCURRENCY})`))
worker.on('completed', (job) => console.log(`[worker] processed ${job.data.id}`))
worker.on('failed', async (job, err) => {
  console.error(`[worker] failed ${job?.data.id}:`, err.message)
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await status.patch(job.data.id, { status: 'failed', error: err.message })
  }
})

const shutdown = async () => {
  console.log('[worker] shutting down...')
  await worker.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
