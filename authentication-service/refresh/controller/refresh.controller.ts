import type { Request, Response } from 'express'
import RefreshService from '../service/refresh.service'
import { success, error } from '../../utils/response'
import { setAuthCookies, clearAuthCookies } from '../../utils/cookies'

const RefreshController = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies?.refresh_token
        if (!token || typeof token !== 'string') {
            return error(res, 'Refresh token missing', 401)
        }

        const result = await RefreshService({ token })

        if (!result.ok) {
            clearAuthCookies(res)
            const status = result.code === 'BANNED' ? 403 : 401
            return error(res, result.message, status)
        }

        setAuthCookies(res, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        })
        return success(res, { user: result.user }, 'Token refreshed', 200)
    } catch (err) {
        console.error('Refresh error:', err)
        return error(res, 'Token refresh failed', 500)
    }
}

export default RefreshController
