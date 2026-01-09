"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { GameSession, Quiz, Question, AnswerOption, Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Users, Play, Copy, Check, X } from "lucide-react"
import { toast } from "sonner"

type FullSession = GameSession & {
  quiz: Quiz & {
    questions: (Question & { answer_options: AnswerOption[] })[]
  }
}

interface HostLobbyProps {
  session: FullSession
}

export function HostLobby({ session }: HostLobbyProps) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [copied, setCopied] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to player joins
    const channel = supabase
      .channel(`host-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `game_session_id=eq.${session.id}`,
        },
        (payload) => {
          setPlayers((prev) => [...prev, payload.new as Player])
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
          filter: `game_session_id=eq.${session.id}`,
        },
        (payload) => {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id))
        },
      )
      .subscribe()

    // Fetch existing players
    supabase
      .from("players")
      .select("*")
      .eq("game_session_id", session.id)
      .then(({ data }) => {
        if (data) setPlayers(data)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  const copyCode = () => {
    navigator.clipboard.writeText(session.game_code)
    setCopied(true)
    toast.success("Code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const kickPlayer = async (playerId: string) => {
    await supabase.from("players").delete().eq("id", playerId)
    toast.success("Player removed")
  }

  const startGame = async () => {
    if (players.length === 0) {
      toast.error("Wait for players to join first")
      return
    }

    setIsStarting(true)

    const { error } = await supabase
      .from("game_sessions")
      .update({
        status: "playing",
        started_at: new Date().toISOString(),
        current_question_index: 0,
      })
      .eq("id", session.id)

    if (error) {
      toast.error("Failed to start game")
      setIsStarting(false)
      return
    }

    router.push(`/host/${session.id}/game`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{session.quiz.title}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span>{players.length} players</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Game Code Display */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-foreground mb-2">Join at quizmaster.ai or enter code</p>
          <div className="flex items-center gap-3">
            <div className="text-6xl md:text-8xl font-bold tracking-widest text-foreground">{session.game_code}</div>
            <Button variant="outline" size="icon" className="bg-transparent" onClick={copyCode}>
              {copied ? <Check className="w-5 h-5 text-secondary" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Players Grid */}
        <Card className="w-full max-w-4xl bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {players.length === 0 ? "Waiting for players..." : `Players (${players.length})`}
            </h3>

            {players.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No players yet. Share the code above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg group relative">
                    <span className="text-2xl">{player.avatar}</span>
                    <span className="text-sm font-medium text-foreground truncate flex-1">{player.nickname}</span>
                    <button
                      type="button"
                      onClick={() => kickPlayer(player.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          size="lg"
          className="mt-8 text-xl px-12 py-8"
          onClick={startGame}
          disabled={players.length === 0 || isStarting}
        >
          <Play className="w-6 h-6 mr-2" />
          {isStarting ? "Starting..." : "Start Game"}
        </Button>

        <p className="mt-4 text-sm text-muted-foreground">{session.quiz.questions?.length || 0} questions ready</p>
      </main>
    </div>
  )
}
