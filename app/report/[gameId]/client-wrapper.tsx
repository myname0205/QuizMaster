"use client"

import { GameReportView } from "@/components/game/game-report-view"
import { Player, PlayerAnswer, Quiz } from "@/lib/types"
import { useRouter } from "next/navigation"

interface Props {
    players: Player[]
    answers: PlayerAnswer[]
    quiz: Quiz
}

export function ReportClientWrapper({ players, answers, quiz }: Props) {
    const router = useRouter()

    return (
        <GameReportView
            players={players}
            answers={answers}
            quiz={quiz}
            onBackToDashboard={() => router.push("/dashboard")}
        />
    )
}
