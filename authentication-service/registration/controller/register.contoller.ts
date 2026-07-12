import type { Request, Response } from 'express'
import RegisterService from '../service/register.service'
import { success, error } from '../../utils/response'
import { setAuthCookies } from '../../utils/cookies'
import type { RegisterBody } from '../register.validation'

const RegisterController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body as RegisterBody

        const result = await RegisterService({ username, email, password })

        if (!result.created) {
            return error(res, result.message, 409)
        }

        setAuthCookies(res, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        })
        return success(res, { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken }, 'User registered successfully', 201)
    } catch (err) {
        console.error('Register error:', err)
        return error(res, 'Registration failed', 500)
    }
}

export default RegisterController
