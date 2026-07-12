const refreshQueries = {
    getAuthById: `SELECT id, username, email, refresh_token, is_ban
                  FROM users
                  WHERE id = $1;`,
}
export default refreshQueries
