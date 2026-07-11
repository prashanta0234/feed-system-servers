import type { ServerResponse } from 'http'


export interface SuccessBody<T> {
  success: true
  message: string
  data: T
}

export interface ErrorBody {
  success: false
  message: string
  errors?: unknown
}

export function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

export function success<T = unknown>(
  res: ServerResponse,
  data: T = null as T,
  message = 'Success',
  status = 200,
): void {
  json(res, status, { success: true, message, data } satisfies SuccessBody<T>)
}

export function error(
  res: ServerResponse,
  message = 'Something went wrong',
  status = 500,
  errors: unknown = null,
): void {
  const payload: ErrorBody = { success: false, message }
  if (errors) payload.errors = errors
  json(res, status, payload)
}

export default { success, error, json }
