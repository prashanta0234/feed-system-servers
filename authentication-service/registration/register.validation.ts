import { z } from 'zod'

export const registerSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'username must be at least 3 characters')
        .max(30, 'username must be at most 30 characters'),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email('a valid email is required')),
    password: z
        .string()
        .min(8, 'password must be at least 8 characters')
        .max(72, 'password must be at most 72 characters'),
})

export type RegisterBody = z.infer<typeof registerSchema>
