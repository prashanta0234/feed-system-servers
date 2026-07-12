import { verifyRefreshToken, signAccessToken, signRefreshToken } from "../../utils/jwt"
import { GetAuthById } from "../model/refresh.model"
import { UpdateRefreshToken } from "../../login/model/login.model"

export type RefreshResult =
    | { ok: false; code: 'INVALID' | 'BANNED'; message: string }
    | {
        ok: true
        user: { id: string; username: string; email: string }
        accessToken: string
        refreshToken: string
    }

const RefreshService = async ({ token }: { token: string }): Promise<RefreshResult> => {
    let payload
    try {
        payload = await verifyRefreshToken(token)
    } catch {
        return { ok: false, code: 'INVALID', message: 'Invalid or expired refresh token' }
    }

    if (typeof payload.sub !== 'string') {
        return { ok: false, code: 'INVALID', message: 'Invalid refresh token' }
    }


    const user = await GetAuthById({ id: payload.sub })
    if (!user || user.refresh_token !== token) {
        return { ok: false, code: 'INVALID', message: 'Refresh token no longer valid' }
    }

    if (user.is_ban) {
        return { ok: false, code: 'BANNED', message: 'Your account has been banned' }
    }

    const [accessToken, refreshToken] = await Promise.all([
        signAccessToken({ sub: user.id, email: user.email, username: user.username }),
        signRefreshToken({ sub: user.id, email: user.email, username: user.username }),
    ])
    await UpdateRefreshToken({ id: user.id, refresh_token: refreshToken })

    return {
        ok: true,
        user: { id: user.id, username: user.username, email: user.email },
        accessToken,
        refreshToken,
    }
}

export default RefreshService
