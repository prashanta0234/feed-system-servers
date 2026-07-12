import type { Response } from 'express'

const isProd = process.env.NODE_ENV === 'production'

const ACCESS_MAX_AGE = 15 * 60 * 1000 // 15m
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7d

const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh'


const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
}

export function setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
): void {
    res.cookie('access_token', tokens.accessToken, {
        ...base,
        path: '/',
        maxAge: ACCESS_MAX_AGE,
    })
    res.cookie('refresh_token', tokens.refreshToken, {
        ...base,
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_MAX_AGE,
    })
}

export function clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { ...base, path: '/' })
    res.clearCookie('refresh_token', { ...base, path: REFRESH_COOKIE_PATH })
}

export default { setAuthCookies, clearAuthCookies }
