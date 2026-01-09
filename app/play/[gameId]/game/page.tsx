import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GameProvider } from "@/components/game/game-provider"
import { PlayerGameView } from "@/components/game/player-game-view"

export default async function PlayerGamePage({
    params,
    searchParams
}: {
    params: Promise<{ gameId: string }>,
    searchParams: Promise<{ playerId: string }>
}) {
    const { gameId } = await params
    const { playerId } = await searchParams
    const supabase = await createClient()

    if (!playerId) {
        redirect("/join")
    }

    // Fetch Game Session
    const { data: session } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("id", gameId)
        .single()

    if (!session) redirect("/join")

    // Fetch Quiz (with questions and options)
    const { data: quiz } = await supabase
        .from("quizzes")
        .select("*, questions(*, answer_options(*))")
        .eq("id", session.quiz_id)
        .single()

    // Sort questions
    if (quiz?.questions) {
        quiz.questions.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return (
        <GameProvider initialSession={session} quiz={quiz} playerId={playerId}>
            <PlayerGameView />
        </GameProvider>
    )
}
