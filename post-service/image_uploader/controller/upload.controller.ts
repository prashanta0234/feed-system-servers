import type { Request, Response } from 'express'
import { success, error } from '../../utils/response.js'
import { parseAndUpload, UploadError } from '../service/upload.service.js'
import { enqueueProcess } from '../service/queue.service.js'
import * as status from '../service/status.service.js'

export const UploadImageController = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await parseAndUpload(req)

    await status.create({ ...result, owner: req.user!.id })
    await enqueueProcess({ id: result.id, key: result.key, mime: result.mime })

    return success(
      res,
      { image_id: result.id, url: result.url, status: 'uploaded', temp: true },
      'Image uploaded (temporary), processing queued',
      201,
    )
  } catch (err) {
    if (err instanceof UploadError) {
      return error(res, err.message, err.statusCode)
    }
    console.error('[image_uploader] upload failed:', err)
    return error(res, 'Image upload failed', 500)
  }
}

export const GetImageController = async (req: Request, res: Response): Promise<void> => {
  const rec = await status.get(String(req.params.id))
  if (!rec) {
    return error(res, 'Image not found or expired', 404)
  }
  if (rec.owner !== req.user!.id) {
    return error(res, 'Forbidden', 403)
  }
  return success(res, {
    image_id: rec.id,
    status: rec.status,
    temp: rec.temp,
    url: rec.url,
    variants: rec.variants ?? null,
    width: rec.width ?? null,
    height: rec.height ?? null,
    error: rec.error ?? null,
  })
}

export default { UploadImageController, GetImageController }
