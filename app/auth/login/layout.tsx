import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Login | QuizMaster",
    description: "Login to your QuizMaster account to create and host quizzes.",
}

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
