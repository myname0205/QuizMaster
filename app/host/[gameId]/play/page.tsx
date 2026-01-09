import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GameProvider } from "@/components/game/game-provider"
import { HostGameView } from "@/components/game/host-game-view"

export default async function HostGamePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // Fetch Game Session
    const { data: session } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("id", gameId)
        .single()

    if (!session) redirect("/dashboard")
    if (session.host_id !== user.id) redirect("/dashboard")

    // Fetch Quiz (with questions and options)
    const { data: quiz } = await supabase
        .from("quizzes")
        .select("*, questions(*, answer_options(*))")
        .eq("id", session.quiz_id)
        .single()

    // Sort questions by order_index
    if (quiz?.questions) {
        quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return (
        <GameProvider initialSession={session} quiz={quiz} isHost={true}>
            <HostGameView />
        </GameProvider>
    )
}
