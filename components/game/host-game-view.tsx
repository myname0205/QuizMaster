"use client"

import { useEffect } from "react"
import { useGame } from "@/components/game/game-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Play, SkipForward, BarChart } from "lucide-react"
import { AVATARS } from "@/lib/types"
import { PodiumView } from "@/components/game/podium-view"
import { GameReportView } from "@/components/game/game-report-view"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { PlayerAnswer } from "@/lib/types"

export function HostGameView() {
    const { session, quiz, players, playerAnswers: currentQuestionAnswers, timeLeft, gameState, nextQuestion, showResults, refreshState } = useGame()
    const router = useRouter()
    const [viewMode, setViewMode] = useState<"game" | "podium" | "report">("game")
    const [allAnswers, setAllAnswers] = useState<PlayerAnswer[]>([])

    const supabase = createClient()

    // Auto-start first question
    useEffect(() => {
        if (!session.question_start_time && session.current_question_index === 0) {
            console.log("[HostGameView] Auto-starting first question")
            nextQuestion()
        }
    }, [session.question_start_time, session.current_question_index, nextQuestion])

    // Detect game finish
    const [hasShownPodium, setHasShownPodium] = useState(false)

    useEffect(() => {
        if (gameState === "finished" || (quiz.questions && session.current_question_index >= quiz.questions.length)) {
            // Only show podium once
            if (!hasShownPodium && viewMode !== "report") {
                refreshState().then(() => {
                    setViewMode("podium")
                    setHasShownPodium(true)
                })
            }
        }
    }, [gameState, session.current_question_index, quiz.questions, refreshState, hasShownPodium, viewMode])

    // Fetch all answers when entering report mode
    useEffect(() => {
        const fetchAllAnswers = async () => {
            if (viewMode === "report") {
                const { data } = await supabase
                    .from("player_answers")
                    .select("*")
                    .eq("game_session_id", session.id)

                if (data) setAllAnswers(data)
            }
        }
        fetchAllAnswers()
    }, [viewMode, session.id])

    if (viewMode === "podium") {
        return <PodiumView players={players} onContinue={() => setViewMode("report")} />
    }

    if (viewMode === "report") {
        return (
            <GameReportView
                players={players}
                answers={allAnswers}
                quiz={quiz}
                onBackToDashboard={() => router.push("/dashboard")}
            />
        )
    }

    const currentQuestion = quiz.questions?.[session.current_question_index]
    if (!currentQuestion) return null // Should be handled by effects above

    const playersAnsweredCount = currentQuestionAnswers.filter(a => a.question_id === currentQuestion.id).length
    const totalPlayers = players.length

    // Progress Bar for Timer
    const timeProgress = (timeLeft / currentQuestion.time_limit) * 100

    // Leaderboard (Simple Sorted List)
    const leaderboard = [...players].sort((a, b) => b.total_score - a.total_score).slice(0, 5)

    return (
        <div className="min-h-screen bg-muted/20 flex flex-col items-center p-6">
            <div className="w-full max-w-6xl space-y-8">

                {/* Header Information */}
                <div className="flex justify-between items-center text-muted-foreground">
                    <span className="font-bold text-lg">Question {session.current_question_index + 1} / {quiz.questions?.length}</span>
                    <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="font-mono font-bold text-foreground">{playersAnsweredCount} / {totalPlayers} Answered</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Question Card */}
                    <Card className="lg:col-span-2 bg-card border-border shadow-lg overflow-hidden">
                        <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black text-foreground max-w-2xl leading-tight">
                                {currentQuestion.question_text}
                            </h2>

                            {/* Timer Circle */}
                            <div className="relative flex items-center justify-center w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64" cy="64" r="60"
                                        stroke="currentColor" strokeWidth="8"
                                        fill="transparent"
                                        className="text-muted/20"
                                    />
                                    <circle
                                        cx="64" cy="64" r="60"
                                        stroke="currentColor" strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={377}
                                        strokeDashoffset={377 - (377 * timeProgress) / 100}
                                        className={`text-primary transition-all duration-100 ease-linear ${timeLeft <= 5 ? "text-red-500 animate-pulse" : ""}`}
                                    />
                                </svg>
                                <span className={`absolute text-4xl font-black ${timeLeft <= 5 ? "text-red-500" : "text-foreground"}`}>
                                    {timeLeft}
                                </span>
                            </div>

                            <div className="w-full max-w-md">
                                {gameState === "waiting" && <div className="text-muted-foreground animate-pulse">Get Ready...</div>}
                                {gameState === "revealing" && <div className="text-xl font-bold text-primary">Time's Up!</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar: Controls & Leaderboard */}
                    <div className="space-y-6">

                        {/* Controls */}
                        <Card className="bg-card border-border">
                            <CardContent className="p-6 space-y-4">
                                <div className="font-bold uppercase text-xs text-muted-foreground tracking-widest mb-2">Host Controls</div>

                                {gameState === "answering" ? (
                                    <Button variant="secondary" size="lg" className="w-full justify-between" onClick={showResults}>
                                        End Question
                                        <SkipForward className="w-5 h-5" />
                                    </Button>
                                ) : gameState === "revealing" || gameState === "waiting" ? (
                                    <Button size="lg" className="w-full justify-between" onClick={nextQuestion}>
                                        Next Question
                                        <Play className="w-5 h-5" />
                                    </Button>
                                ) : null}
                            </CardContent>
                        </Card>

                        {/* Leaderboard */}
                        <Card className="bg-card border-border flex-1">
                            <CardContent className="p-6">
                                <div className="font-bold uppercase text-xs text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                                    <BarChart className="w-4 h-4" />
                                    Live Rankings
                                </div>
                                <div className="space-y-3">
                                    {leaderboard.map((player, index) => (
                                        <div key={player.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                            ${index === 0 ? "bg-yellow-500 text-yellow-950" :
                                                        index === 1 ? "bg-gray-400 text-gray-900" :
                                                            index === 2 ? "bg-amber-700 text-amber-100" : "bg-muted text-muted-foreground"}
                                        `}>
                                                    {index + 1}
                                                </div>
                                                <span className="text-xl">{player.avatar}</span>
                                                <span className="font-medium truncate max-w-[120px]">{player.nickname}</span>
                                            </div>
                                            <span className="font-mono font-bold text-primary">{player.total_score}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
