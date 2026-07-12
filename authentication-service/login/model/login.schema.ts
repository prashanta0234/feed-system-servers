const loginQueries = {
    getUserByEmail: `SELECT id, username, email, password_hash, refresh_token, is_ban
                     FROM users
                     WHERE email = $1;`,
    updateRefreshToken: `UPDATE users SET refresh_token = $1 WHERE id = $2;`,
}
export default loginQueries
