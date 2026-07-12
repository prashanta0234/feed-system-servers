import type { Request, Response, NextFunction } from 'express'
import type { JWTPayload } from 'jose'
import { verifyToken } from '../jwt.js'
import { error } from '../response.js'

export interface AuthUser {
  id: string
  email?: string
  username?: string
  issuer?: string
  issuedAt?: number
  expiresAt?: number
  claims: JWTPayload
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token
  return cookieToken || null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req)
  if (!token) {
    error(res, 'Authentication required', 401)
    return
  }
  try {
    const payload = await verifyToken(token)
    req.user = {
      id: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      username: typeof payload.username === 'string' ? payload.username : undefined,
      issuer: payload.iss,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      claims: payload,
    }
    next()
  } catch {
    error(res, 'Invalid or expired token', 401)
  }
}

export default requireAuth
