import { Router } from 'express'
import registrationRouter from './registration/registration.router'
import loginRouter from './login/login.router'
import refreshRouter from './refresh/refresh.router'

const router = Router()

router.use('/auth', registrationRouter)
router.use('/auth', loginRouter)
router.use('/auth', refreshRouter)

export default router
