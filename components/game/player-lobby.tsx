"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { GameSession, Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Users } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AVATARS } from "@/lib/types"

interface PlayerLobbyProps {
  session: GameSession & { quiz: { title: string; description: string | null } }
}

export function PlayerLobby({ session }: PlayerLobbyProps) {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [isJoining, setIsJoining] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [gameStatus, setGameStatus] = useState(session.status)
  const [players, setPlayers] = useState<Player[]>([])

  const supabase = createClient()

  // Subscribe to game status changes
  useEffect(() => {
    const channel = supabase
      .channel(`game-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status
          setGameStatus(newStatus)

          if (newStatus === "playing" && playerId) {
            // Game started - redirect to arena
            router.push(`/play/${session.id}/game?playerId=${playerId}`)
          }
        },
      )
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
  }, [session.id, playerId, router, supabase])

  const handleJoin = async () => {
    if (!nickname.trim()) {
      toast.error("Please enter a nickname")
      return
    }

    setIsJoining(true)

    const { data, error } = await supabase
      .from("players")
      .insert({
        game_session_id: session.id,
        nickname: nickname.trim(),
        avatar: selectedAvatar,
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to join game")
      setIsJoining(false)
      return
    }

    setPlayerId(data.id)
    toast.success("You're in! Waiting for the host to start...")
    setIsJoining(false)
  }

  // If game is already playing and player hasn't joined
  if (gameStatus !== "waiting" && !playerId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Game Already Started</h2>
            <p className="text-muted-foreground">This game is already in progress.</p>
            <Button className="mt-6" onClick={() => router.push("/join")}>
              Join Another Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Player has joined - show waiting screen
  if (playerId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Quidle" width={32} height={32} />
              <span className="font-semibold text-foreground">{session.quiz.title}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-6xl mb-6">{selectedAvatar}</div>
          <h2 className="text-3xl font-bold text-foreground mb-2">{nickname}</h2>
          <p className="text-muted-foreground mb-8">You're in! Waiting for the host to start...</p>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span>
              {players.length} player{players.length !== 1 ? "s" : ""} joined
            </span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-md">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 bg-card px-3 py-2 rounded-full border border-border"
              >
                <span>{player.avatar}</span>
                <span className="text-sm text-foreground">{player.nickname}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Join form
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Quidle logo" width={44} height={44} />
            <span className="font-[family-name:var(--font-brand)] text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quidle</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Joining</div>
            <CardTitle className="text-2xl text-foreground">{session.quiz.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Choose your avatar</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={cn(
                      "text-2xl p-2 rounded-lg transition-all",
                      selectedAvatar === avatar
                        ? "bg-primary/20 ring-2 ring-primary scale-110"
                        : "bg-muted hover:bg-muted/80",
                    )}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Enter your nickname</label>
              <Input
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                className="text-center text-lg h-12 bg-input border-border"
                maxLength={20}
              />
            </div>

            <Button
              size="lg"
              className="w-full text-lg py-6"
              onClick={handleJoin}
              disabled={isJoining || !nickname.trim()}
            >
              {isJoining ? "Joining..." : "Join Game"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
