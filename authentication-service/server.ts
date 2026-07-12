import express from 'express'
import cookieParser from 'cookie-parser'
import router from './router'

const app = express()
const PORT = Number(process.env.PORT || 4000)

app.use(express.json())
app.use(cookieParser())
app.use('/api/v1', router)

app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'authentication-service is up' })
})

app.listen(PORT, () => {
    console.log(`[server] authentication-service listening on :${PORT}`)
})
