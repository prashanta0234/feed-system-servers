import type { Request, Response } from 'express'
import LoginService from '../service/login.service'
import { success, error } from '../../utils/response'
import { setAuthCookies } from '../../utils/cookies'
import type { LoginBody } from '../login.validation'

const LoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body as LoginBody

        const result = await LoginService({ email, password })

        if (!result.ok) {
            const status = result.code === 'BANNED' ? 403 : 401
            return error(res, result.message, status)
        }

        setAuthCookies(res, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        })
        return success(res, { user: result.user }, 'Logged in successfully', 200)
    } catch (err) {
        console.error('Login error:', err)
        return error(res, 'Login failed', 500)
    }
}

export default LoginController
