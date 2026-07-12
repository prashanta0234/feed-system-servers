import { read, write } from "../../utils/db"
import registationSchema from "./register.schema"

interface UserRow { id: string, username: string, email: string }

const AddUserModel = async ({ username, email, password_hash, refresh_token }: { username: string, email: string, password_hash: string, refresh_token: string }): Promise<UserRow> => {
    try {
        const result = await write<UserRow>(registationSchema.addUsers, [username, email, password_hash, refresh_token])
        return result.rows[0]

    } catch (error) {
        console.error('Error adding user:', error)
        throw error
    }
}

const CheckUsers = async ({ email }: { email: string }) => {
    try {
        const isExists = await read(registationSchema.checkIsExists, [email])
        if (isExists.rows.length > 0) {
            return true;
        }
        else {
            return false;
        }
    } catch (error) {
        console.error('Error checking user existence:', error)
        throw error

    }
}

export { AddUserModel, CheckUsers }