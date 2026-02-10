import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Sign Up | QuizMaster",
    description: "Create a free QuizMaster account and start hosting AI-powered quizzes today.",
}

export default function SignUpLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
