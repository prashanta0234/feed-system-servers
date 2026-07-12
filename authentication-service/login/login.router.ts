import { Router } from 'express'
import LoginController from './controller/login.controller'
import { validateBody } from '../utils/validate'
import { loginSchema } from './login.validation'

const loginRouter = Router()

loginRouter.post('/login', validateBody(loginSchema), LoginController)

export default loginRouter
