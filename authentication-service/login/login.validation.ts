import { z } from 'zod'

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email('a valid email is required')),
    password: z.string().min(1, 'password is required'),
})

export type LoginBody = z.infer<typeof loginSchema>
