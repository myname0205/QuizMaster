"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { GameSession, Quiz, Question, AnswerOption, Player, PlayerAnswer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, ChevronRight, Trophy } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type FullSession = GameSession & {
  quiz: Quiz & {
    questions: (Question & { answer_options: AnswerOption[] })[]
  }
}

interface HostGameProps {
  session: FullSession
  initialPlayers: Player[]
}

type GamePhase = "question" | "results" | "leaderboard" | "final"

export function HostGame({ session, initialPlayers }: HostGameProps) {
  const router = useRouter()
  const supabase = createClient()

  const questions = session.quiz.questions || []
  const [currentIndex, setCurrentIndex] = useState(session.current_question_index || 0)
  const [phase, setPhase] = useState<GamePhase>("question")
  const [timeLeft, setTimeLeft] = useState(questions[currentIndex]?.time_limit || 30)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [answers, setAnswers] = useState<PlayerAnswer[]>([])
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({})

  const currentQuestion = questions[currentIndex]

  // Timer countdown
  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase("results")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase, timeLeft])

  // Broadcast current question to players
  const broadcastQuestion = useCallback(async () => {
    const channel = supabase.channel(`game-broadcast-${session.id}`)
    await channel.subscribe()
    await channel.send({
      type: "broadcast",
      event: "question",
      payload: {
        questionIndex: currentIndex,
        question: {
          id: currentQuestion.id,
          question_text: currentQuestion.question_text,
          time_limit: currentQuestion.time_limit,
          points: currentQuestion.points,
          answer_options: currentQuestion.answer_options.map((a) => ({
            id: a.id,
            option_text: a.option_text,
            order_index: a.order_index,
          })),
        },
        phase: "question",
      },
    })
  }, [currentIndex, currentQuestion, session.id, supabase])

  // Subscribe to player answers
  useEffect(() => {
    const channel = supabase
      .channel(`host-answers-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_answers",
          filter: `question_id=eq.${currentQuestion?.id}`,
        },
        (payload) => {
          const answer = payload.new as PlayerAnswer
          setAnswers((prev) => [...prev, answer])

          // Update answer counts
          if (answer.answer_option_id) {
            setAnswerCounts((prev) => ({
              ...prev,
              [answer.answer_option_id!]: (prev[answer.answer_option_id!] || 0) + 1,
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentQuestion?.id, session.id, supabase])

  // Broadcast question on mount and question change
  useEffect(() => {
    if (currentQuestion && phase === "question") {
      broadcastQuestion()
    }
  }, [currentIndex, currentQuestion, broadcastQuestion, phase])

  // Broadcast phase changes
  useEffect(() => {
    const broadcast = async () => {
      const channel = supabase.channel(`game-broadcast-${session.id}`)
      await channel.subscribe()
      await channel.send({
        type: "broadcast",
        event: "phase",
        payload: { phase, questionIndex: currentIndex },
      })
    }

    if (phase === "results" || phase === "leaderboard") {
      broadcast()
    }
  }, [phase, currentIndex, session.id, supabase])

  const showResults = () => {
    setPhase("results")
  }

  const showLeaderboard = async () => {
    // Update player scores
    const { data: updatedPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("game_session_id", session.id)
      .order("total_score", { ascending: false })

    if (updatedPlayers) {
      setPlayers(updatedPlayers)
    }

    setPhase("leaderboard")
  }

  const nextQuestion = async () => {
    const nextIndex = currentIndex + 1

    if (nextIndex >= questions.length) {
      // Game finished
      await supabase
        .from("game_sessions")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", session.id)

      // Broadcast game end
      const channel = supabase.channel(`game-broadcast-${session.id}`)
      await channel.subscribe()
      await channel.send({
        type: "broadcast",
        event: "game_end",
        payload: { sessionId: session.id },
      })

      router.push(`/host/${session.id}/results`)
      return
    }

    // Update game session
    await supabase.from("game_sessions").update({ current_question_index: nextIndex }).eq("id", session.id)

    setCurrentIndex(nextIndex)
    setPhase("question")
    setTimeLeft(questions[nextIndex].time_limit)
    setAnswers([])
    setAnswerCounts({})
  }

  const colors = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"]

  if (!currentQuestion) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/quidle-logo.svg" alt="Quidle" width={32} height={32} />
            <span
              className="font-[family-name:var(--font-brand)] font-bold"
              style={{ background: "linear-gradient(135deg,#E040FB,#00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Quidle
            </span>
            <span className="text-muted-foreground font-normal text-sm">— {session.quiz.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5" />
              <span>{answers.length} answered</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Q{currentIndex + 1}/{questions.length}
            </span>
          </div>
        </div>
      </header>

      {phase === "question" && (
        <main className="flex-1 flex flex-col p-6">
          {/* Timer */}
          <div className="max-w-4xl mx-auto w-full mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Time remaining</span>
              <span className="text-2xl font-bold text-foreground">{timeLeft}s</span>
            </div>
            <Progress value={(timeLeft / currentQuestion.time_limit) * 100} className="h-3" />
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
            <Card className="w-full bg-card border-border mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center text-balance">
                  {currentQuestion.question_text}
                </h2>
              </CardContent>
            </Card>

            {/* Answer Options */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {currentQuestion.answer_options.map((option, idx) => (
                <div key={option.id} className={cn("rounded-xl p-6 text-white", colors[idx])}>
                  <span className="text-lg md:text-xl font-medium">{option.option_text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button variant="outline" size="lg" onClick={showResults} className="bg-transparent">
              End Question Early
            </Button>
          </div>
        </main>
      )}

      {phase === "results" && (
        <main className="flex-1 flex flex-col p-6">
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
            {/* Question Recap */}
            <Card className="bg-card border-border mb-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground text-center">{currentQuestion.question_text}</h2>
              </CardContent>
            </Card>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {currentQuestion.answer_options.map((option, idx) => {
                const count = answerCounts[option.id] || 0
                const total = answers.length || 1
                const percentage = Math.round((count / total) * 100)

                return (
                  <div
                    key={option.id}
                    className={cn(
                      "rounded-xl p-6 relative overflow-hidden",
                      option.is_correct ? "ring-4 ring-secondary" : "",
                      colors[idx],
                    )}
                  >
                    <div className="relative z-10">
                      <span className="text-lg font-medium text-white">{option.option_text}</span>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-2xl font-bold text-white">{count}</span>
                        <span className="text-white/80">{percentage}%</span>
                      </div>
                    </div>
                    {option.is_correct && (
                      <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-bold">
                        CORRECT
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={showLeaderboard}>
                <Trophy className="w-5 h-5 mr-2" />
                Show Leaderboard
              </Button>
            </div>
          </div>
        </main>
      )}

      {phase === "leaderboard" && (
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <h2 className="text-3xl font-bold text-foreground mb-8">Leaderboard</h2>

          <div className="w-full max-w-md space-y-3">
            {players.slice(0, 5).map((player, idx) => (
              <Card
                key={player.id}
                className={cn(
                  "bg-card border-border",
                  idx === 0 && "ring-2 ring-accent",
                  idx === 1 && "ring-2 ring-muted-foreground/50",
                  idx === 2 && "ring-2 ring-chart-3/50",
                )}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      idx === 0 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-2xl">{player.avatar}</span>
                  <span className="font-medium text-foreground flex-1">{player.nickname}</span>
                  <span className="font-bold text-primary">{player.total_score.toLocaleString()}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button size="lg" className="mt-8" onClick={nextQuestion}>
            {currentIndex + 1 >= questions.length ? (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                See Final Results
              </>
            ) : (
              <>
                Next Question
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </main>
      )}
    </div>
  )
}
