import { CheckUsers, AddUserModel } from "../model/registation.model"
import { hashPassword } from "../../utils/password"
import { signAccessToken, signRefreshToken } from "../../utils/jwt"

export interface RegisterInput {
    username: string
    email: string
    password: string
}

export type RegisterResult =
    | { created: false; message: string }
    | {
        created: true
        user: { id: string; username: string; email: string }
        accessToken: string
        refreshToken: string
    }

const RegisterService = async ({ username, email, password }: RegisterInput): Promise<RegisterResult> => {
    const isExists = await CheckUsers({ email })
    if (isExists) {
        return { created: false, message: 'User already exists' }
    }

    const [password_hash, accessToken, refreshToken] = await Promise.all([
        hashPassword(password),
        signAccessToken({ sub: email, username }),
        signRefreshToken({ sub: email, username }),
    ])

    const user = await AddUserModel({ username, email, password_hash, refresh_token: refreshToken })

    return { created: true, user, accessToken, refreshToken }
}

export default RegisterService
