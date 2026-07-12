import type { IncomingMessage } from 'http'
import { Transform } from 'stream'
import Busboy from 'busboy'
import { put, publicUrl, keyFor } from '../../config/r2.js'
import { newImageId } from '../../utils/ids.js'

const MAX_BYTES = Number(process.env.IMAGE_MAX_BYTES || 10 * 1024 * 1024)

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export class UploadError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'UploadError'
    this.statusCode = statusCode
  }
}

export interface UploadResult {
  id: string
  key: string
  url: string
  mime: string
  size: number
}

// Counts bytes flowing through without buffering the payload
class ByteCounter extends Transform {
  bytes = 0
  _transform(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null, d?: Buffer) => void) {
    this.bytes += chunk.length
    cb(null, chunk)
  }
}


export function parseAndUpload(req: IncomingMessage): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    let bb: ReturnType<typeof Busboy>
    try {
      bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } })
    } catch {
      reject(new UploadError('Expected multipart/form-data'))
      return
    }

    let handled = false
    let uploadPromise: Promise<UploadResult> | null = null

    bb.on('file', (_field, file, info) => {
      if (handled) {
        file.resume()
        return
      }
      handled = true

      const mime = info.mimeType
      const ext = EXT_BY_MIME[mime]
      if (!ext) {
        file.resume()
        reject(new UploadError(`Unsupported image type: ${mime}`, 415))
        return
      }

      const id = newImageId()
      const key = keyFor(id, `original.${ext}`)
      const counter = new ByteCounter()
      let tooLarge = false

      file.on('limit', () => {
        tooLarge = true
      })

      uploadPromise = put(key, file.pipe(counter), mime).then(() => {
        if (tooLarge) {
          throw new UploadError(`Image exceeds ${MAX_BYTES} byte limit`, 413)
        }
        return { id, key, url: publicUrl(key), mime, size: counter.bytes }
      })
    })

    bb.on('error', (err) => reject(err instanceof Error ? err : new Error(String(err))))

    bb.on('close', () => {
      if (!uploadPromise) {
        reject(new UploadError('No image file in request'))
        return
      }
      uploadPromise.then(resolve, reject)
    })

    req.pipe(bb)
  })
}

export default { parseAndUpload, UploadError }
