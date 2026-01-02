import { createFileRoute } from '@tanstack/react-router'
import Navbar from '../../components/navbar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpSchema, SignUpData } from './schema'
import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core';

export const Route = createFileRoute('/sign-up/')({
	component: SignUp,
})

function SignUp() {
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignUpData>({
		resolver: zodResolver(signUpSchema)
	})

	const onSubmit = (data: SignUpData) => {
		setIsLoading(true)
		invoke('sign_up', {
			username: data.username,
			email: data.email,
			password: data.password
		}).then((res) => {
			console.log(res)
		}).catch((err) => {
			console.error(err)
		})
		setIsLoading(false)
	}

	return (
		<div>
			<Navbar />
			<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-5 max-w-md mx-auto mt-8">
				<div className="flex gap-1 flex-col">
					<label htmlFor="username" className="text-lg">Username</label>
					<input
						id='username'
						type='text'
						{...register('username')}
						placeholder="johndoe"
						className="border-gray-300 border px-2 py-1"
					/>
					{errors.username && <p className="text-red-600 text-sm">{errors.username.message}</p>}
				</div>
				<div className="flex gap-1 flex-col">
					<label htmlFor="email" className="text-lg">Email Address</label>
					<input
						id='email'
						type='email'
						{...register('email')}
						placeholder="Email"
						className="border-gray-300 border px-2 py-1"
					/>
					{errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
				</div>
				<div className="flex gap-1 flex-col">
					<label htmlFor="password" className="text-lg">Password</label>
					<input
						id='password'
						type='password'
						{...register('password')}
						placeholder="secret password"
						className="border-gray-300 border px-2 py-1"
					/>
					{errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
				</div>
				<div>
					<button
						type='submit'
						className="border-2 mx-auto px-3 py-1 dark:hover:bg-sand dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={isLoading}
					>
						{isLoading ? 'Loading...' : 'Sign In'}
					</button>
				</div>
			</form>
		</div>
	)
}
