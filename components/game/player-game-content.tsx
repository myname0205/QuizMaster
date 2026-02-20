"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Zap, Clock, Check, X, CheckCircle2, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface QuestionData {
  id: string
  question_text: string
  time_limit: number
  points: number
  question_type?: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT"
  answer_options: {
    id: string
    option_text: string
    order_index: number
    is_correct?: boolean
  }[]
}

const ANSWER_COLORS = [
  "bg-red-500 hover:bg-red-600 border-red-700",
  "bg-blue-500 hover:bg-blue-600 border-blue-700",
  "bg-yellow-500 hover:bg-yellow-600 border-yellow-700 text-yellow-950",
  "bg-green-500 hover:bg-green-600 border-green-700"
]

export function PlayerGameContent({ params }: { params?: Promise<{ sessionId: string }> }) {
  // Graceful fallback if params not passed (though we prefer useParams in client components)
  // const { sessionId } = use(params!) 
  // actually, safer to just use useParams() for a client component to avoid prop drilling issues in some architectures
  const paramsHook = useParams()
  const sessionId = (paramsHook?.sessionId as string) || ""
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const router = useRouter()
  const supabase = createClient()

  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
  const [phase, setPhase] = useState<"waiting" | "question" | "answered" | "results" | "leaderboard">("waiting")
  const [timeLeft, setTimeLeft] = useState(30)

  // State for answers
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null) // Legacy single
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]) // Multi
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        setSelectedOptions([])
        setIsSubmitting(false)
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
          if (!selectedAnswer && selectedOptions.length === 0 && !isSubmitting) {
            setPhase("results")
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, timeLeft, selectedAnswer, selectedOptions, isSubmitting])

  const submitAnswer = async (answerInput: string | string[]) => {
    if ((selectedAnswer || isSubmitting) || !currentQuestion || !playerId) return

    let answerOptionId: string | null = null
    let answerOptionIds: string[] | null = null

    if (Array.isArray(answerInput)) {
      answerOptionIds = answerInput
      setSelectedOptions(answerInput)
    } else {
      answerOptionId = answerInput
      setSelectedAnswer(answerInput)
    }

    setIsSubmitting(true)
    setPhase("answered")

    const responseTimeMs = Date.now() - questionStartTime

    // Submit answer to database
    try {
      // Fetch correct answer(s)
      const { data: correctOptions } = await supabase
        .from("answer_options")
        .select("id, is_correct")
        .eq("question_id", currentQuestion.id)
        .eq("is_correct", true)

      const isMultiSelect = currentQuestion.question_type === "MULTIPLE_SELECT"
      let isCorrect = false

      if (isMultiSelect) {
        // Exact match logic
        const correctIds = correctOptions?.map((o: { id: string }) => o.id) || []
        const selectedIds = answerOptionIds || []

        const hasSameLength = correctIds.length === selectedIds.length
        const allSelectedAreCorrect = selectedIds.every(id => correctIds.includes(id))
        isCorrect = hasSameLength && allSelectedAreCorrect
      } else {
        // Single match
        const selectedId = answerOptionId
        const correctId = correctOptions?.[0]?.id
        isCorrect = selectedId === correctId
      }

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
      const insertPayload: any = {
        player_id: playerId,
        question_id: currentQuestion.id,
        answer_option_id: answerOptionId,
        answer_option_ids: answerOptionIds,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        points_earned: pointsEarned,
      }

      await supabase.from("player_answers").insert(insertPayload)

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
      setIsSubmitting(false) // Allow retry? or just stuck? Stuck is better than error loop
    }
  }

  const handleOptionClick = (optionId: string) => {
    if (isSubmitting || selectedAnswer) return

    const isMultiSelect = currentQuestion?.question_type === "MULTIPLE_SELECT"

    if (isMultiSelect) {
      setSelectedOptions(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId)
        } else {
          return [...prev, optionId]
        }
      })
    } else {
      submitAnswer(optionId)
    }
  }

  const handleMultiSubmit = () => {
    if (selectedOptions.length === 0) return
    submitAnswer(selectedOptions)
  }

  const colors = ANSWER_COLORS // Start using consistent colors

  if (!playerId) {
    return null
  }

  const isMultiSelect = currentQuestion?.question_type === "MULTIPLE_SELECT"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/quidle-logo.svg" alt="Quidle logo" width={28} height={28} />
            <span className="font-[family-name:var(--font-brand)] font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quidle</span>
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

          {isMultiSelect && (
            <div className="text-center mb-4 text-sm text-muted-foreground font-medium uppercase tracking-wider animate-pulse">
              Select all that apply
            </div>
          )}

          {/* Answer Options */}
          <div className="flex-1 grid grid-cols-1 gap-3">
            {currentQuestion.answer_options.map((option, idx) => {
              const isSelected = selectedOptions.includes(option.id)

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option.id)}
                  disabled={!!selectedAnswer || isSubmitting}
                  className={cn(
                    "rounded-xl p-4 text-white text-left font-medium transition-all active:scale-95 relative",
                    colors[idx % colors.length], // Use modulo to prevent index error
                    (selectedAnswer && !selectedAnswer.includes(option.id)) && "opacity-50", // Dim unselected
                    isMultiSelect && isSelected && "ring-4 ring-offset-2 ring-primary brightness-110",
                    isMultiSelect && !isSelected && "opacity-90"
                  )}
                >
                  {isMultiSelect && (
                    <div className={cn("absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center", isSelected ? "bg-white text-black" : "bg-transparent")}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  )}
                  {option.option_text}
                </button>
              )
            })}
          </div>

          {/* Submit Button for Multi-Select */}
          {isMultiSelect && (
            <div className="mt-6">
              <Button
                size="lg"
                className="w-full text-xl py-6 font-bold uppercase tracking-widest shadow-xl"
                onClick={handleMultiSubmit}
                disabled={selectedOptions.length === 0 || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Submit Answer"}
              </Button>
            </div>
          )}
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
