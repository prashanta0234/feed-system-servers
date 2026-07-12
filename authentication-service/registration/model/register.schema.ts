const registationSchema = {
    checkIsExists: `SELECT id FROM users WHERE email = $1;`,
    addUsers: `INSERT INTO users (username, email, password_hash, refresh_token, is_ban)
               VALUES ($1, $2, $3, $4, false)
               RETURNING id, username, email;`
}
export default registationSchema
