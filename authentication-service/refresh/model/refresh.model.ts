import { read } from "../../utils/db"
import refreshQueries from "./refresh.schema"

export interface RefreshUserRow {
    id: string
    username: string
    email: string
    refresh_token: string | null
    is_ban: boolean
}

export const GetAuthById = async ({ id }: { id: string }): Promise<RefreshUserRow | null> => {
    try {
        const result = await read<RefreshUserRow>(refreshQueries.getAuthById, [id])
        return result.rows[0] ?? null
    } catch (error) {
        console.error('Error fetching auth user by id:', error)
        throw error
    }
}
