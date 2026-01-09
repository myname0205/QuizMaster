"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { GameSession, Player, Quiz } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Play, Copy, ArrowRight, UserMinus } from "lucide-react"
import { toast } from "sonner"

interface LobbyScreenProps {
    session: GameSession
    quiz: Quiz
}

export function LobbyScreen({ session, quiz }: LobbyScreenProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Subscribe to players
    useEffect(() => {
        // Initial fetch
        const fetchPlayers = async () => {
            const { data } = await supabase
                .from("players")
                .select("*")
                .eq("game_session_id", session.id)
                .order("joined_at", { ascending: true })

            if (data) {
                console.log("[LobbyScreen] Fetched players:", data.length)
                setPlayers(data)
            }
        }

        fetchPlayers()

        // Realtime subscription
        const playersChannel = supabase
            .channel("players-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "players",
                    filter: `game_session_id=eq.${session.id}`,
                },
                (payload) => {
                    console.log("[LobbyScreen] Realtime event:", payload.eventType)
                    if (payload.eventType === "INSERT") {
                        setPlayers((prev) => [...prev, payload.new as Player])
                        toast.success(`${(payload.new as Player).nickname} joined!`)
                    } else if (payload.eventType === "DELETE") {
                        setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        // Polling fallback every 3 seconds
        const interval = setInterval(async () => {
            const { data } = await supabase
                .from("players")
                .select("*")
                .eq("game_session_id", session.id)
                .order("joined_at", { ascending: true })

            if (data && data.length !== players.length) {
                console.log("[LobbyScreen] Poll update - players changed")
                setPlayers(data)
            }
        }, 3000)

        return () => {
            supabase.removeChannel(playersChannel)
            clearInterval(interval)
        }
    }, [session.id, supabase, players.length])

    const copyCode = () => {
        navigator.clipboard.writeText(session.game_code)
        toast.success("Game code copied to clipboard")
    }

    const handleStartGame = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from("game_sessions")
                .update({ status: "playing", started_at: new Date().toISOString() })
                .eq("id", session.id)

            if (error) throw error

            router.push(`/host/${session.id}/play`)
        } catch (error) {
            toast.error("Failed to start game")
            console.error(error)
            setIsLoading(false)
        }
    }

    const kickPlayer = async (playerId: string, playerName: string) => {
        try {
            const { error } = await supabase
                .from("players")
                .delete()
                .eq("id", playerId)

            if (error) throw error
            toast.success(`Kicked ${playerName}`)
        } catch (error) {
            console.error("Error kicking player:", error)
            toast.error("Failed to kick player")
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-border bg-card p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">Lobby: {quiz.title}</h1>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{players.length} Players</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 flex flex-col items-center justify-center gap-8">
                <div className="text-center space-y-4">
                    <p className="text-muted-foreground uppercase tracking-widest text-sm font-semibold">Join at quizmaster.com/join with code</p>
                    <div
                        className="text-7xl md:text-9xl font-black tracking-widest text-primary cursor-pointer hover:scale-105 transition-transform"
                        onClick={copyCode}
                        title="Click to copy"
                    >
                        {session.game_code}
                    </div>
                    <Button variant="outline" size="sm" onClick={copyCode} className="mt-2">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                    </Button>
                </div>

                <div className="w-full max-w-4xl">
                    {players.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground animate-pulse">
                            Waiting for players to join...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {players.map((player) => (
                                <div key={player.id} className="group relative">
                                    <Card className="bg-card border-border overflow-hidden hover:border-primary transition-colors">
                                        <CardContent className="p-4 flex flex-col items-center gap-2">
                                            <div className="text-4xl">{player.avatar || "👤"}</div>
                                            <span className="font-medium truncate w-full text-center">{player.nickname}</span>
                                        </CardContent>
                                    </Card>
                                    <button
                                        onClick={() => kickPlayer(player.id, player.nickname)}
                                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        title="Kick player"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="border-t border-border bg-card p-4 sticky bottom-0">
                <div className="container mx-auto flex justify-center">
                    <Button size="lg" className="w-full max-w-md text-lg h-14" onClick={handleStartGame} disabled={isLoading}>
                        {isLoading ? "Starting..." : "Start Game"}
                        {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                    </Button>
                </div>
            </footer>
        </div>
    )
}
