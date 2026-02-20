import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Login | Quidle",
    description: "Login to your Quidle account to create and host quizzes.",
}

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
