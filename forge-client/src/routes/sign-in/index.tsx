import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Navbar from '../../components/navbar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInSchema, SignInData } from './schema'
import { invoke } from '@tauri-apps/api/core';

export const Route = createFileRoute('/sign-in/')({
	component: RouteComponent,
})

function RouteComponent() {
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignInData>({
		resolver: zodResolver(signInSchema)
	})

	const onSubmit = (data: SignInData) => {
		setIsLoading(true)
		invoke('sign_in', {
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
