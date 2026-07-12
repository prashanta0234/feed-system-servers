import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { importPKCS8, importSPKI, SignJWT, jwtVerify, type JWTPayload } from 'jose'

const ALG = 'RS256'
const ISSUER = process.env.JWT_ISSUER || 'authentication-service'
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m'
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '7d'

const privatePem = readFileSync(fileURLToPath(new URL('../private.pem', import.meta.url)), 'utf8')
const publicPem = readFileSync(fileURLToPath(new URL('../public.pem', import.meta.url)), 'utf8')

const privateKey = await importPKCS8(privatePem, ALG)
const publicKey = await importSPKI(publicPem, ALG)

export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(ACCESS_TTL)
    .sign(privateKey)
}

export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(REFRESH_TTL)
    .sign(privateKey)
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, publicKey, { issuer: ISSUER })
  return payload
}

// verifies signature/expiry/issuer AND that this is a refresh token (not an access token)
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const payload = await verifyToken(token)
  if (payload.type !== 'refresh') {
    throw new Error('not a refresh token')
  }
  return payload
}

export default { signAccessToken, signRefreshToken, verifyToken, verifyRefreshToken }
