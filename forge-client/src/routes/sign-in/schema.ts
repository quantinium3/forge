import { z } from 'zod'

export const signInSchema = z.object({
	email: z.email({ error: "Invalid email" }),
	password: z.string({ error: "Password is required" })
		.min(8, { error: "Password must be at least 8 characters long" })
		.regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
			, { error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" }),
});

export type SignInData = z.infer<typeof signInSchema>
