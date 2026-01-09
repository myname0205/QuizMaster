"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Zap, Clock, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface QuestionData {
  id: string
  question_text: string
  time_limit: number
  points: number
  answer_options: {
    id: string
    option_text: string
    order_index: number
    is_correct?: boolean
  }[]
}

export function PlayerGameContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const router = useRouter()
  const supabase = createClient()

  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
  const [phase, setPhase] = useState<"waiting" | "question" | "answered" | "results" | "leaderboard">("waiting")
  const [timeLeft, setTimeLeft] = useState(30)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; points: number } | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)

  // Subscribe to game broadcasts
  useEffect(() => {
    if (!playerId) {
      router.push(`/play/${sessionId}`)
      return
    }

    const channel = supabase
      .channel(`game-broadcast-${sessionId}`)
      .on("broadcast", { event: "question" }, ({ payload }) => {
        setCurrentQuestion(payload.question)
        setPhase("question")
        setTimeLeft(payload.question.time_limit)
        setSelectedAnswer(null)
        setAnswerResult(null)
        setQuestionStartTime(Date.now())
      })
      .on("broadcast", { event: "phase" }, ({ payload }) => {
        if (payload.phase === "results") {
          setPhase("results")
        } else if (payload.phase === "leaderboard") {
          setPhase("leaderboard")
        }
      })
      .on("broadcast", { event: "game_end" }, () => {
        router.push(`/play/${sessionId}/results?playerId=${playerId}`)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, playerId, router, supabase])

  // Timer countdown
  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!selectedAnswer) {
            setPhase("results")
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, timeLeft, selectedAnswer])

  const submitAnswer = async (optionId: string) => {
    if (selectedAnswer || !currentQuestion || !playerId) return

    setSelectedAnswer(optionId)
    setPhase("answered")

    const responseTimeMs = Date.now() - questionStartTime

    // Submit answer to database
    try {
      // First, get the correct answer from the database
      const { data: correctOption } = await supabase
        .from("answer_options")
        .select("id, is_correct")
        .eq("question_id", currentQuestion.id)
        .eq("is_correct", true)
        .single()

      const isCorrect = correctOption?.id === optionId

      // Calculate points (bonus for speed)
      let pointsEarned = 0
      if (isCorrect) {
        const timeBonus = Math.max(
          0,
          (currentQuestion.time_limit * 1000 - responseTimeMs) / (currentQuestion.time_limit * 1000),
        )
        pointsEarned = Math.round(currentQuestion.points * (0.5 + 0.5 * timeBonus))
      }

      // Save answer
      await supabase.from("player_answers").insert({
        player_id: playerId,
        question_id: currentQuestion.id,
        answer_option_id: optionId,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        points_earned: pointsEarned,
      })

      // Update player score
      if (pointsEarned > 0) {
        await supabase.rpc("increment_player_score", {
          p_player_id: playerId,
          p_points: pointsEarned,
        })
        setTotalScore((prev) => prev + pointsEarned)
      }

      setAnswerResult({ correct: isCorrect, points: pointsEarned })
    } catch (error) {
      console.error("Failed to submit answer:", error)
      toast.error("Failed to submit answer")
    }
  }

  const colors = [
    "bg-chart-1 hover:bg-chart-1/90",
    "bg-chart-2 hover:bg-chart-2/90",
    "bg-chart-3 hover:bg-chart-3/90",
    "bg-chart-4 hover:bg-chart-4/90",
  ]

  if (!playerId) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">QuizMaster</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Score</div>
            <div className="font-bold text-foreground">{totalScore.toLocaleString()}</div>
          </div>
        </div>
      </header>

      {phase === "waiting" && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Get Ready!</h2>
            <p className="text-muted-foreground">Waiting for the next question...</p>
          </div>
        </main>
      )}

      {phase === "question" && currentQuestion && (
        <main className="flex-1 flex flex-col p-4">
          {/* Timer */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Time remaining</span>
              <span className="text-xl font-bold text-foreground">{timeLeft}s</span>
            </div>
            <Progress value={(timeLeft / currentQuestion.time_limit) * 100} className="h-2" />
          </div>

          {/* Question */}
          <Card className="bg-card border-border mb-4">
            <CardContent className="p-4">
              <h2 className="text-lg font-bold text-foreground text-center">{currentQuestion.question_text}</h2>
            </CardContent>
          </Card>

          {/* Answer Options */}
          <div className="flex-1 grid grid-cols-1 gap-3">
            {currentQuestion.answer_options.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => submitAnswer(option.id)}
                disabled={!!selectedAnswer}
                className={cn(
                  "rounded-xl p-4 text-white text-left font-medium transition-all active:scale-95",
                  colors[idx],
                  selectedAnswer && "opacity-50",
                )}
              >
                {option.option_text}
              </button>
            ))}
          </div>
        </main>
      )}

      {phase === "answered" && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            {answerResult ? (
              answerResult.correct ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-secondary" />
                  </div>
                  <h2 className="text-3xl font-bold text-secondary mb-2">Correct!</h2>
                  <p className="text-xl text-foreground">+{answerResult.points} points</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <X className="w-10 h-10 text-destructive" />
                  </div>
                  <h2 className="text-3xl font-bold text-destructive mb-2">Wrong</h2>
                  <p className="text-muted-foreground">Better luck next time!</p>
                </>
              )
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Answer Submitted!</h2>
                <p className="text-muted-foreground">Waiting for results...</p>
              </>
            )}
          </div>
        </main>
      )}

      {(phase === "results" || phase === "leaderboard") && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {phase === "results" ? "Time's Up!" : "Leaderboard"}
            </h2>
            <p className="text-muted-foreground mb-4">Look at the main screen!</p>
            <div className="text-lg text-foreground">
              Your score: <span className="font-bold text-primary">{totalScore.toLocaleString()}</span>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
