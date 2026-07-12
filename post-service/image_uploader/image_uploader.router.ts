import { Router } from 'express'
import { requireAuth } from '../utils/middleware/auth.middleware.js'
import { UploadImageController, GetImageController } from './controller/upload.controller.js'

const imageUploaderRouter = Router()

imageUploaderRouter.use(requireAuth)

imageUploaderRouter.post('/images', UploadImageController)
imageUploaderRouter.get('/images/:id', GetImageController)

export default imageUploaderRouter
