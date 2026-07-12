import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { importSPKI, jwtVerify, type JWTPayload } from 'jose'


const ALG = 'RS256'
const ISSUER = process.env.JWT_ISSUER || 'authentication-service'

const publicPem = readFileSync(fileURLToPath(new URL('../public.pem', import.meta.url)), 'utf8')
const publicKey = await importSPKI(publicPem, ALG)

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, publicKey, { issuer: ISSUER })
  return payload
}

export default { verifyToken }
