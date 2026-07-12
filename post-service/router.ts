import { Router } from 'express'
import imageUploaderRouter from './image_uploader/image_uploader.router.js'

const router = Router()

router.use('/posts', imageUploaderRouter)

export default router
