import { z } from 'zod'

export const signUpSchema = z.object({
	username: z.string({ error: "Username is required" })
		.min(3, { error: "Username must be at least 3 characters long" })
		.max(20, { error: "Username must be at most 20 characters long" }),
	email: z.email({ error: "Invalid email" }),
	password: z.string({ error: "Password is required" })
		.min(8, { error: "Password must be at least 8 characters long" })
		.regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
			, { error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" }),
});

export type SignUpData = z.infer<typeof signUpSchema>
