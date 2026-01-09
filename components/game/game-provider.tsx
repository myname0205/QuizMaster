"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { GameSession, Player, PlayerAnswer, Quiz } from "@/lib/types"
import { toast } from "sonner"

interface GameContextType {
    session: GameSession
    quiz: Quiz
    players: Player[]
    playerAnswers: PlayerAnswer[]
    timeLeft: number
    gameState: "waiting" | "reading" | "answering" | "revealing" | "finished"
    isHost: boolean
    startGame: () => Promise<void>
    nextQuestion: () => Promise<void>
    showResults: () => Promise<void>
    submitAnswer: (answerId: string) => Promise<void>
    refreshState: () => Promise<void>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

interface GameProviderProps {
    children: ReactNode
    initialSession: GameSession
    quiz: Quiz
    isHost?: boolean
    playerId?: string
}

export function GameProvider({
    children,
    initialSession,
    quiz,
    isHost = false,
    playerId
}: GameProviderProps) {
    const [session, setSession] = useState(initialSession)
    const [players, setPlayers] = useState<Player[]>([])
    const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer[]>([])
    const [timeLeft, setTimeLeft] = useState(0)
    const [gameState, setGameState] = useState<GameContextType["gameState"]>("waiting")
    const supabase = createClient()

    // RELATIVE TIMING: Track when we locally started seeing this question
    // This avoids clock skew issues between Host (who sets start_time) and Player (who answers)
    const localStartTimeRef = useRef<number>(0)

    useEffect(() => {
        if (session.question_start_time) {
            // Reset local timer when a new question starts
            localStartTimeRef.current = Date.now()
        }
    }, [session.question_start_time, session.current_question_index])

    // Initial Data Fetch
    useEffect(() => {
        const fetchGameData = async () => {
            // Fetch Players
            const { data: playersData } = await supabase
                .from("players")
                .select("*")
                .eq("game_session_id", session.id)
            if (playersData) setPlayers(playersData)

            // Clear old answers and fetch new ones for current question
            setPlayerAnswers([])

            if (session.current_question_index >= 0) {
                const currentQuestionId = quiz.questions?.[session.current_question_index]?.id
                if (currentQuestionId) {
                    const { data: answersData } = await supabase
                        .from("player_answers")
                        .select("*")
                        .eq("game_session_id", session.id)
                        .eq("question_id", currentQuestionId)
                    if (answersData) setPlayerAnswers(answersData)
                }
            }
        }
        fetchGameData()
    }, [session.id, session.current_question_index, quiz.questions, supabase])

    // Realtime Subscriptions
    useEffect(() => {
        const channel = supabase
            .channel(`game:${session.id}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${session.id}` },
                (payload) => {
                    setSession(payload.new as GameSession)
                })
            .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_session_id=eq.${session.id}` },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setPlayers(prev => [...prev, payload.new as Player])
                    } else if (payload.eventType === "DELETE") {
                        setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
                    } else if (payload.eventType === "UPDATE") {
                        setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new as Player : p))
                    }
                })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "player_answers", filter: `game_session_id=eq.${session.id}` },
                (payload) => {
                    setPlayerAnswers(prev => [...prev, payload.new as PlayerAnswer])
                })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [session.id, supabase])

    // Polling Fallback to ensure sync
    useEffect(() => {
        const interval = setInterval(async () => {
            const { data: latestSession } = await supabase
                .from("game_sessions")
                .select("*")
                .eq("id", session.id)
                .single()

            if (latestSession) {
                // Determine if we need to update state to avoid unnecessary re-renders or loops
                // Primarily check for time/index/status changes
                if (
                    latestSession.current_question_index !== session.current_question_index ||
                    latestSession.question_start_time !== session.question_start_time ||
                    latestSession.status !== session.status
                ) {
                    setSession(latestSession)
                }
            }

            // Also poll for answers to ensure we don't miss any (Realtime backup)
            if (session.current_question_index >= 0 && quiz.questions) {
                const currentQId = quiz.questions[session.current_question_index]?.id
                if (currentQId) {
                    const { data: answers } = await supabase
                        .from("player_answers")
                        .select("*")
                        .eq("game_session_id", session.id)
                        .eq("question_id", currentQId)

                    if (answers) {
                        setPlayerAnswers(prev => {
                            // Only update if count changes to avoid re-renders (basic check)
                            // or if we have 0 locally but server has some (missed realtime)
                            if (prev.length !== answers.length) {
                                console.log("[GameProvider] Polling updated answers:", answers.length)
                                return answers
                            }
                            return prev
                        })
                    }
                }
            }
        }, 1000) // Poll every 1s for better responsiveness

        return () => clearInterval(interval)
    }, [session.id, session.current_question_index, session.question_start_time, session.status, supabase, quiz])

    // Timer Logic
    useEffect(() => {
        if (!session.question_start_time) {
            setTimeLeft(0)
            return
        }

        const currentQuestion = quiz.questions?.[session.current_question_index]
        if (!currentQuestion) return

        const startTime = new Date(session.question_start_time).getTime()
        const timeLimitMs = currentQuestion.time_limit * 1000
        const endTime = startTime + timeLimitMs

        const interval = setInterval(() => {
            const now = Date.now()
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
            setTimeLeft(remaining)

            if (remaining <= 0) {
                clearInterval(interval)
            }
        }, 100)

        return () => clearInterval(interval)
    }, [session.question_start_time, session.current_question_index, quiz.questions])

    // Game State Derivation
    // Game State Derivation
    useEffect(() => {
        let newState: GameContextType["gameState"] = "waiting"

        if (session.status === "finished") {
            newState = "finished"
        } else if (session.question_start_time) {
            // Calculate real state independent of the ticked 'timeLeft' to avoid initial flash
            // when timeLeft is 0 but start time was just set.
            const startTime = new Date(session.question_start_time).getTime()
            const currentQ = quiz.questions?.[session.current_question_index]

            // Default to 20s if missing, though it shouldn't be
            const timeLimitMs = (currentQ?.time_limit || 20) * 1000
            const now = Date.now()
            const isTimeUp = now >= (startTime + timeLimitMs)

            newState = isTimeUp ? "revealing" : "answering"
        } else {
            newState = "waiting"
        }

        setGameState(newState)
    }, [session.status, session.question_start_time, timeLeft, quiz.questions, session.current_question_index])


    // Actions
    const startGame = async () => {
        // Already started in lobby, but this ensures we move to Q1
        await nextQuestion()
    }

    const nextQuestion = async () => {
        let nextIndex = session.current_question_index + 1

        // If we are starting the game (time is null), we want to start Q1 (index 0)
        // Assumption: default index is 0.
        if (!session.question_start_time) {
            nextIndex = session.current_question_index
        }

        console.log("[nextQuestion] Starting - currentIndex:", session.current_question_index, "nextIndex:", nextIndex, "hasStartTime:", !!session.question_start_time)

        if (nextIndex >= (quiz.questions?.length || 0)) {
            console.log("[nextQuestion] Game finished")
            await supabase.from("game_sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", session.id)
            return
        }

        const newStartTime = new Date().toISOString()
        console.log("[nextQuestion] Updating DB - sessionId:", session.id, "nextIndex:", nextIndex, "newStartTime:", newStartTime)

        const { data, error } = await supabase.from("game_sessions").update({
            current_question_index: nextIndex,
            question_start_time: newStartTime
        }).eq("id", session.id).select()

        if (error) {
            console.error("[nextQuestion] DB UPDATE FAILED:", error)
            toast.error("Failed to start question: " + error.message)
        } else {
            console.log("[nextQuestion] DB UPDATE SUCCESS - returned data:", data)
        }
    }

    const showResults = async () => {
        // In this simple manual mode, "Show Results" might just clear the start time to stop timer?
        // Or we keep it simple: Wait for timer to run out.
        // Let's implement force stop timer.
        await supabase.from("game_sessions").update({
            // Setting start time to past creates "time up" state
            question_start_time: new Date(Date.now() - 1000000).toISOString()
        }).eq("id", session.id)
    }

    const submitAnswer = async (answerOptionId: string) => {
        console.log("[submitAnswer] Called with:", { answerOptionId, playerId, gameState, currentIndex: session.current_question_index })

        if (!playerId) {
            console.error("[submitAnswer] No playerId!")
            toast.error("Player ID missing")
            return
        }

        if (gameState !== "answering") {
            console.error("[submitAnswer] Wrong game state:", gameState)
            toast.error("Can't answer right now")
            return
        }

        const currentQuestion = quiz.questions?.[session.current_question_index]
        if (!currentQuestion) {
            console.error("[submitAnswer] No current question")
            return
        }

        const answerOption = currentQuestion.answer_options?.find(o => o.id === answerOptionId)
        const isCorrect = answerOption?.is_correct || false

        // Calculate Score
        let points = 0
        const now = Date.now()

        // Calculate precise time taken if start time exists
        let timeTakenMs = 0
        if (session.question_start_time) {
            const startTime = new Date(session.question_start_time).getTime()
            timeTakenMs = Math.max(0, now - startTime)
        }

        if (isCorrect) {
            // Formula: Base points (50%) + Speed Bonus (0-50%)
            // Bonus is linear based on time remaining
            const maxPoints = currentQuestion.points
            const timeLimitMs = currentQuestion.time_limit * 1000

            // If answered after limit (grace period?), 0 bonus.
            // We clamp ratio between 0 and 1.
            const ratio = Math.max(0, Math.min(1, 1 - (timeTakenMs / timeLimitMs)))

            const speedBonus = maxPoints * 0.5 * ratio
            points = Math.round((maxPoints * 0.5) + speedBonus)

            console.log("[submitAnswer] Score Calc:", {
                timeLimitMs,
                timeTakenMs,
                ratio,
                maxPoints,
                points
            })
        }

        console.log("[submitAnswer] Submitting answer:", { isCorrect, points })

        const newAnswer = {
            game_session_id: session.id,
            player_id: playerId,
            question_id: currentQuestion.id,
            answer_option_id: answerOptionId,
            is_correct: isCorrect,
            points_earned: points,
            answered_at: new Date().toISOString()
        }

        const { error: insertError } = await supabase.from("player_answers").insert(newAnswer)

        if (insertError) {
            console.error("[submitAnswer] Insert failed:", insertError)
            toast.error("Failed to submit answer: " + insertError.message)
            return
        }

        console.log("[submitAnswer] Answer saved!")

        // Optimistic update - add answer to local state immediately
        setPlayerAnswers(prev => [...prev, { ...newAnswer, id: crypto.randomUUID(), response_time_ms: 0 } as PlayerAnswer])

        if (points > 0) {
            // Update player total score
            const { data: currentPlayer } = await supabase.from("players").select("total_score").eq("id", playerId).single()
            if (currentPlayer) {
                await supabase.from("players").update({ total_score: currentPlayer.total_score + points }).eq("id", playerId)
            }
        }
    }

    const refreshState = useCallback(async () => {
        console.log("[GameProvider] Forcing state refresh...")
        const { data: playersData } = await supabase
            .from("players")
            .select("*")
            .eq("game_session_id", session.id)
        if (playersData) setPlayers(playersData)

        if (session.current_question_index >= 0 && quiz.questions) {
            const currentQId = quiz.questions[session.current_question_index]?.id
            if (currentQId) {
                const { data: answersData } = await supabase
                    .from("player_answers")
                    .select("*")
                    .eq("game_session_id", session.id)
                    .eq("question_id", currentQId)
                if (answersData) {
                    console.log("[GameProvider] refreshState fetched answers:", answersData.length)
                    setPlayerAnswers(answersData)
                }
            }
        }
    }, [session.id, session.current_question_index, quiz.questions, supabase])

    return (
        <GameContext.Provider value={{ session, quiz, players, playerAnswers, timeLeft, gameState, isHost, startGame, nextQuestion, showResults, submitAnswer, refreshState }}>
            {children}
        </GameContext.Provider>
    )
}

export const useGame = () => {
    const context = useContext(GameContext)
    if (!context) throw new Error("useGame must be used within GameProvider")
    return context
}
