import { read, write } from "../../utils/db"
import loginQueries from "./login.schema"

export interface AuthUserRow {
    id: string
    username: string
    email: string
    password_hash: string
    refresh_token: string | null
    is_ban: boolean
}

export const GetUserByEmail = async ({ email }: { email: string }): Promise<AuthUserRow | null> => {
    try {
        const result = await read<AuthUserRow>(loginQueries.getUserByEmail, [email])
        return result.rows[0] ?? null
    } catch (error) {
        console.error('Error fetching user by email:', error)
        throw error
    }
}

export const UpdateRefreshToken = async ({ id, refresh_token }: { id: string, refresh_token: string }): Promise<void> => {
    try {
        await write(loginQueries.updateRefreshToken, [refresh_token, id])
    } catch (error) {
        console.error('Error updating refresh token:', error)
        throw error
    }
}
