import { Router } from 'express'
import RegisterController from './controller/register.contoller'
import { validateBody } from '../utils/validate'
import { registerSchema } from './register.validation'

const registrationRouter = Router()

registrationRouter.post('/register', validateBody(registerSchema), RegisterController)

export default registrationRouter
