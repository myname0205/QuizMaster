import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LobbyScreen } from "@/components/game/lobby-screen"

export default async function HostLobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: session } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("id", gameId)
        .single()

    if (!session) {
        redirect("/dashboard")
    }

    if (session.host_id !== user.id) {
        redirect("/dashboard")
    }

    if (session.status === "playing") {
        redirect(`/host/${session.id}/play`)
    }

    const { data: quiz } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", session.quiz_id)
        .single()

    if (!quiz) {
        redirect("/dashboard")
    }

    return <LobbyScreen session={session} quiz={quiz} />
}
