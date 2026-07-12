import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'
import { error } from './response'


export function validateBody<T>(schema: ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body)

        if (!result.success) {
            const fields: Record<string, string> = {}
            for (const issue of result.error.issues) {
                const key = issue.path.join('.') || '_'
                if (!fields[key]) fields[key] = issue.message
            }
            return error(res, 'Validation failed', 400, fields)
        }

        req.body = result.data
        next()
    }
}

export default { validateBody }
