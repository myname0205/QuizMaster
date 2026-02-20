"use client"

import Link from "next/link"
import type { GameSession, Player, PlayerAnswer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Home, Download, Users, Target, Clock } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface HostResultsProps {
  session: GameSession & { quiz: { title: string; description: string | null } }
  players: Player[]
  answers: (PlayerAnswer & {
    player: { nickname: string; avatar: string }
    question: { question_text: string }
  })[]
}

export function HostResults({ session, players, answers }: HostResultsProps) {
  const totalQuestions = [...new Set(answers.map((a) => a.question_id))].length
  const correctAnswers = answers.filter((a) => a.is_correct).length
  const totalAnswers = answers.length
  const avgAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
  const avgResponseTime =
    answers.length > 0 ? Math.round(answers.reduce((acc, a) => acc + (a.response_time_ms || 0), 0) / answers.length) : 0

  const downloadResults = () => {
    const csvRows = [["Rank", "Player", "Score", "Correct Answers", "Accuracy"]]

    players.forEach((player, idx) => {
      const playerAnswers = answers.filter((a) => a.player_id === player.id)
      const correctCount = playerAnswers.filter((a) => a.is_correct).length
      const accuracy = playerAnswers.length > 0 ? Math.round((correctCount / playerAnswers.length) * 100) : 0

      csvRows.push([
        (idx + 1).toString(),
        player.nickname,
        player.total_score.toString(),
        correctCount.toString(),
        `${accuracy}%`,
      ])
    })

    const csvContent = csvRows.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${session.quiz.title.replace(/[^a-z0-9]/gi, "_")}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/quidle-logo.svg" alt="Quidle" width={36} height={36} />
            <span
              className="font-[family-name:var(--font-brand)] font-bold text-lg"
              style={{ background: "linear-gradient(135deg,#E040FB,#00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Quidle
            </span>
            <span className="text-muted-foreground font-normal text-sm">— {session.quiz.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-transparent" onClick={downloadResults}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Link href="/dashboard">
              <Button>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Game Complete!</h1>
          <p className="text-muted-foreground">Here are the final results</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{players.length}</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{avgAccuracy}%</div>
              <div className="text-sm text-muted-foreground">Avg Accuracy</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{(avgResponseTime / 1000).toFixed(1)}s</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-chart-3 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
        </div>

        {/* Podium */}
        {players.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-12">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-2">{players[1]?.avatar}</div>
              <div className="font-semibold text-foreground mb-1">{players[1]?.nickname}</div>
              <div className="text-sm text-muted-foreground mb-2">{players[1]?.total_score.toLocaleString()}</div>
              <div className="w-24 h-20 bg-muted-foreground/30 rounded-t-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="text-5xl mb-2">{players[0]?.avatar}</div>
              <div className="font-semibold text-foreground mb-1">{players[0]?.nickname}</div>
              <div className="text-sm text-primary font-bold mb-2">{players[0]?.total_score.toLocaleString()}</div>
              <div className="w-24 h-28 bg-accent rounded-t-lg flex items-center justify-center">
                <Trophy className="w-8 h-8 text-accent-foreground" />
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-2">{players[2]?.avatar}</div>
              <div className="font-semibold text-foreground mb-1">{players[2]?.nickname}</div>
              <div className="text-sm text-muted-foreground mb-2">{players[2]?.total_score.toLocaleString()}</div>
              <div className="w-24 h-16 bg-chart-3/50 rounded-t-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-chart-3">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card className="bg-card border-border max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-foreground">Full Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players.map((player, idx) => {
                const playerAnswers = answers.filter((a) => a.player_id === player.id)
                const correctCount = playerAnswers.filter((a) => a.is_correct).length

                return (
                  <div
                    key={player.id}
                    className={cn("flex items-center gap-4 p-3 rounded-lg", idx < 3 ? "bg-muted" : "bg-background")}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        idx === 0
                          ? "bg-accent text-accent-foreground"
                          : idx === 1
                            ? "bg-muted-foreground/30 text-foreground"
                            : idx === 2
                              ? "bg-chart-3/30 text-chart-3"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-xl">{player.avatar}</span>
                    <span className="font-medium text-foreground flex-1">{player.nickname}</span>
                    <span className="text-sm text-muted-foreground">
                      {correctCount}/{totalQuestions} correct
                    </span>
                    <span className="font-bold text-primary">{player.total_score.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
