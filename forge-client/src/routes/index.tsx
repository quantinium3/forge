import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: Index,
})

function Index() {
	return (
		<div className="p-2">
			<h3 className="">Welcome Home!</h3>
			<Link to="/sign-in">Sign In</Link>
			<Link to="/sign-up">Sign Up</Link>
		</div>
	)
}
