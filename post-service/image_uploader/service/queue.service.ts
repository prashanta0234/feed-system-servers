import { Queue } from 'bullmq'

export const IMAGE_QUEUE = 'image-processing'

export interface ProcessJob {
  id: string
  key: string
  mime: string
}


export const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB || 0),
}

export const imageQueue = new Queue<ProcessJob>(IMAGE_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
})

export function enqueueProcess(job: ProcessJob): Promise<unknown> {
  return imageQueue.add('process', job, { jobId: job.id })
}

export default { imageQueue, enqueueProcess, IMAGE_QUEUE, connection }
