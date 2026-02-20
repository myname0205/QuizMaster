import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Join a Game | Quidle",
    description: "Enter your game code to join a live quiz session.",
}

export default function JoinLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
