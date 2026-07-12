import { Router } from 'express'
import RefreshController from './controller/refresh.controller'

const refreshRouter = Router()

refreshRouter.post('/refresh', RefreshController)

export default refreshRouter
