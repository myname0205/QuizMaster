"use client"

import { useGame } from "@/components/game/game-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"

const ANSWER_COLORS = [
    "bg-red-500 hover:bg-red-600 border-red-700",
    "bg-blue-500 hover:bg-blue-600 border-blue-700",
    "bg-yellow-500 hover:bg-yellow-600 border-yellow-700 text-yellow-950",
    "bg-green-500 hover:bg-green-600 border-green-700"
]

const ANSWER_ICONS = ["🔺", "🔷", "🟡", "🟩"] // Shapes for accessibility/standard quiz style

export function PlayerGameView() {
    return <PlayerGameContent />
}

function PlayerGameContent() {
    const { session, quiz, playerAnswers, timeLeft, gameState, submitAnswer, players } = useGame()
    const searchParams = useSearchParams()
    const playerId = searchParams.get("playerId")

    // State for answering
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedOptions, setSelectedOptions] = useState<string[]>([])


    // Guard against null quiz
    if (!quiz || !quiz.questions) {
        return (
            <div className="min-h-screen bg-primary/10 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-card border-border shadow-xl">
                    <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Loading Game Data...</h2>
                            <p className="text-muted-foreground">Please wait while we fetch the quiz.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = quiz.questions[session.current_question_index]
    const isMultiSelect = currentQuestion?.question_type === "MULTIPLE_SELECT"
    const myAnswer = playerAnswers.find(a => a.player_id === playerId && a.question_id === currentQuestion?.id)
    const hasAnswered = !!myAnswer || isSubmitting

    // Reset state when question changes
    useEffect(() => {
        setIsSubmitting(false)
        setSelectedOptions([])
    }, [session.current_question_index])

    const handleOptionClick = async (optionId: string) => {
        if (isSubmitting || hasAnswered) return

        if (isMultiSelect) {
            // Toggle selection
            setSelectedOptions(prev => {
                if (prev.includes(optionId)) {
                    return prev.filter(id => id !== optionId)
                } else {
                    return [...prev, optionId]
                }
            })
        } else {
            // Single select: immediate submit
            setIsSubmitting(true)
            await submitAnswer(optionId)
        }
    }

    const handleMultiSubmit = async () => {
        if (selectedOptions.length === 0 || isSubmitting) return
        setIsSubmitting(true)
        await submitAnswer(selectedOptions)
    }

    // Game Over Screen
    if (!currentQuestion || gameState === "finished") {
        const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score)
        const myRank = sortedPlayers.findIndex(p => p.id === playerId) + 1
        const myPlayer = sortedPlayers.find(p => p.id === playerId)
        const displayScore = myPlayer?.total_score || 0

        return (
            <div className="min-h-screen bg-primary/10 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-card border-border shadow-xl animate-in zoom-in-95">
                    <CardContent className="p-12 flex flex-col items-center text-center space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black text-primary">Game Over!</h1>
                            <p className="text-muted-foreground text-lg">Thanks for playing</p>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="bg-muted/50 p-4 rounded-xl">
                                <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Rank</div>
                                <div className="text-4xl font-black">
                                    <span className="text-primary">#</span>{myRank > 0 ? myRank : "-"}
                                </div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-xl">
                                <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">Score</div>
                                <div className="text-4xl font-black">
                                    {displayScore}
                                </div>
                            </div>
                        </div>

                        {myRank === 1 && (
                            <div className="bg-yellow-100 text-yellow-800 px-6 py-2 rounded-full font-bold animate-bounce">
                                🏆 You Won! 🏆
                            </div>
                        )}
                        {myRank > 1 && myRank <= 3 && (
                            <div className="bg-blue-100 text-blue-800 px-6 py-2 rounded-full font-bold">
                                Top 3 finish! 👏
                            </div>
                        )}

                        <Button className="w-full" variant="outline" onClick={() => window.location.href = "/join"}>
                            Play Another Game
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (gameState === "waiting") {
        return (
            <div className="min-h-screen bg-primary/10 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-card border-border shadow-xl">
                    <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Get Ready!</h2>
                            <p className="text-muted-foreground">Look at the host screen...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Time Up / Locked (Revealing but not answered)
    if (gameState === "revealing" && !hasAnswered) {
        return (
            <div className="min-h-screen bg-primary/10 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-card border-border shadow-xl">
                    <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-4xl">⏳</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
                            <p className="text-muted-foreground">You didn't answer in time.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Feedback Screen (Answered)
    if (hasAnswered) {
        const isRevealing = gameState === "revealing"

        return (
            <div className={cn("min-h-screen flex items-center justify-center p-4 transition-colors duration-500",
                isRevealing
                    ? (myAnswer?.is_correct ? "bg-green-500/20" : "bg-red-500/20")
                    : "bg-primary/5"
            )}>
                <Card className="w-full max-w-md bg-card border-border shadow-xl transform animate-in zoom-in-95">
                    <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                        {isRevealing ? (
                            <>
                                {myAnswer?.is_correct ? (
                                    <CheckCircle2 className="w-20 h-20 text-green-500" />
                                ) : (
                                    <XCircle className="w-20 h-20 text-red-500" />
                                )}
                                <div>
                                    <h2 className="text-3xl font-black mb-2">
                                        {myAnswer?.is_correct ? "Correct!" : "Wrong!"}
                                    </h2>
                                    <p className="text-xl font-bold text-muted-foreground">
                                        +{myAnswer?.points_earned} pts
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-4xl">🔒</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Answer Locked</h2>
                                    <p className="text-muted-foreground">Waiting for time up...</p>
                                </div>
                            </>
                        )}

                        <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-100 ease-linear"
                                style={{ width: `${(timeLeft / currentQuestion.time_limit) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Question / Answer Buttons
    return (
        <div className="min-h-screen bg-background flex flex-col p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-muted-foreground">Q{session.current_question_index + 1}</span>
                <span className="font-mono font-bold text-2xl">{timeLeft}s</span>
            </div>

            {/* Question Text */}
            <div className="text-center mb-2 font-bold text-xl md:text-2xl text-foreground px-4 animate-in fade-in slide-in-from-top-4">
                {currentQuestion.question_text}
            </div>

            {isMultiSelect && (
                <div className="text-center mb-6 text-sm text-muted-foreground font-medium uppercase tracking-wider animate-pulse">
                    Select all that apply
                </div>
            )}

            {/* Answer Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full mb-8">
                {currentQuestion.answer_options?.map((option, index) => {
                    const isSelected = selectedOptions.includes(option.id)

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleOptionClick(option.id)}
                            disabled={isSubmitting || hasAnswered}
                            className={cn(
                                "flex flex-col items-center justify-center p-8 rounded-2xl border-b-8 transition-all shadow-lg relative",
                                (isSubmitting || hasAnswered) ? "opacity-50 cursor-not-allowed" : "active:scale-95 active:border-b-0 translate-y-0 active:translate-y-2",
                                ANSWER_COLORS[index % ANSWER_COLORS.length],
                                // Multi-select Styling Overrides for Selection State
                                isMultiSelect && isSelected && "ring-4 ring-offset-4 ring-primary scale-[0.98] border-b-0 translate-y-2 brightness-110",
                                isMultiSelect && !isSelected && "opacity-90"
                            )}
                        >
                            {/* Checkbox indicator for multi-select */}
                            {isMultiSelect && (
                                <div className={cn("absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center", isSelected ? "bg-white text-black" : "bg-transparent")}>
                                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                </div>
                            )}

                            <span className="text-4xl mb-4 text-white drop-shadow-md">{ANSWER_ICONS[index % ANSWER_ICONS.length]}</span>
                            <span className="text-xl md:text-2xl font-bold text-white drop-shadow-md text-center">
                                {option.option_text}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Submit Button for Multi-Select */}
            {isMultiSelect && (
                <div className="max-w-4xl mx-auto w-full mb-4">
                    <Button
                        size="lg"
                        className="w-full text-xl py-8 font-black uppercase tracking-widest shadow-xl"
                        onClick={handleMultiSubmit}
                        disabled={selectedOptions.length === 0 || isSubmitting || hasAnswered}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Submit Answer"}
                    </Button>
                </div>
            )}
        </div>
    )
}
