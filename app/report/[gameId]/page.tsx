import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GameReportView } from "@/components/game/game-report-view"
import { GameSession, Player, PlayerAnswer, Quiz } from "@/lib/types"
import { ReportClientWrapper } from "./client-wrapper"

export default async function ReportPage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // 1. Fetch Game Session to verify ownership and getting quiz_id
    const { data: session } = await supabase
        .from("game_sessions")
        .select("*, quiz:quizzes(*)")
        .eq("id", gameId)
        .single()

    if (!session || session.host_id !== user.id) {
        return <div className="p-8 text-center text-red-500">Report not found or access denied.</div>
    }

    // 2. Fetch Quiz with Questions
    // (Note: We need questions to display the report properly. We can get them via the session->quiz relation if we join properly, 
    // or fetch separately. The query above `quiz:quizzes(*)` gets quiz metadata, but maybe not deep questions if Supabase recursive depth is limited.
    // Let's fetch questions explicitly to be safe and robust.)
    const { data: quizData } = await supabase
        .from("quizzes")
        .select("*, questions(*, answer_options(*))")
        .eq("id", session.quiz_id)
        .single()

    // If quiz is deleted, construct a fallback "Ghost Quiz" so we can still show player results
    const finalQuiz = quizData || {
        id: "deleted",
        user_id: user.id,
        title: "Deleted Quiz",
        description: "This quiz has been deleted.",
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: []
    }

    // 3. Fetch Players
    const { data: players } = await supabase
        .from("players")
        .select("*")
        .eq("game_session_id", session.id)

    // 4. Fetch All Answers
    const { data: answers } = await supabase
        .from("player_answers")
        .select("*")
        .eq("game_session_id", session.id)

    // Client Component Wrapper
    return (
        <ReportClientWrapper
            players={players || []}
            answers={answers || []}
            quiz={finalQuiz as Quiz}
        />
    )
}
