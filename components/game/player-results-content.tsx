"use client"

import { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Trophy, Home } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function PlayerResultsContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const searchParams = useSearchParams()
  const playerId = searchParams.get("playerId")
  const supabase = createClient()

  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [rank, setRank] = useState(0)

  useEffect(() => {
    const fetchResults = async () => {
      // Fetch all players sorted by score
      const { data: allPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("game_session_id", sessionId)
        .order("total_score", { ascending: false })

      if (allPlayers) {
        setPlayers(allPlayers)

        // Find current player
        const player = allPlayers.find((p) => p.id === playerId)
        if (player) {
          setCurrentPlayer(player)
          setRank(allPlayers.findIndex((p) => p.id === playerId) + 1)
        }
      }
    }

    fetchResults()
  }, [sessionId, playerId, supabase])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2.5">
            <Image src="/quidle-logo.svg" alt="Quidle logo" width={36} height={36} />
            <span className="font-[family-name:var(--font-brand)] font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quidle</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Player Result */}
        {currentPlayer && (
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{currentPlayer.avatar}</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{currentPlayer.nickname}</h2>

            {rank <= 3 ? (
              <div className="mb-4">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                    rank === 1 && "bg-accent text-accent-foreground",
                    rank === 2 && "bg-muted-foreground/30 text-foreground",
                    rank === 3 && "bg-chart-3/30 text-chart-3",
                  )}
                >
                  {rank === 1 && <Trophy className="w-5 h-5" />}
                  <span className="font-bold">
                    {rank === 1 ? "1st Place!" : rank === 2 ? "2nd Place!" : "3rd Place!"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground mb-4">
                Finished #{rank} of {players.length}
              </div>
            )}

            <div className="text-4xl font-bold text-primary">{currentPlayer.total_score.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">points</div>
          </div>
        )}

        {/* Top 5 Leaderboard */}
        <Card className="w-full max-w-sm bg-card border-border mb-8">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-4 text-center">Top Players</h3>
            <div className="space-y-2">
              {players.slice(0, 5).map((player, idx) => (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    player.id === playerId && "bg-primary/10 ring-1 ring-primary",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
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
                  <span className="text-lg">{player.avatar}</span>
                  <span className="font-medium text-foreground flex-1 truncate">{player.nickname}</span>
                  <span className="font-bold text-primary text-sm">{player.total_score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Link href="/join">
          <Button size="lg">
            <Home className="w-5 h-5 mr-2" />
            Play Again
          </Button>
        </Link>
      </main>
    </div>
  )
}
