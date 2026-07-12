import { GetUserByEmail, UpdateRefreshToken } from "../model/login.model"
import { verifyPassword } from "../../utils/password"
import { signAccessToken, signRefreshToken } from "../../utils/jwt"

export interface LoginInput {
    email: string
    password: string
}

export type LoginResult =
    | { ok: false; code: 'INVALID' | 'BANNED'; message: string }
    | {
        ok: true
        user: { id: string; username: string; email: string }
        accessToken: string
        refreshToken: string
    }

const LoginService = async ({ email, password }: LoginInput): Promise<LoginResult> => {
    const user = await GetUserByEmail({ email })


    if (!user) {
        return { ok: false, code: 'INVALID', message: 'Invalid email or password' }
    }

    const passwordOk = await verifyPassword(password, user.password_hash)
    if (!passwordOk) {
        return { ok: false, code: 'INVALID', message: 'Invalid email or password' }
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

export default LoginService
