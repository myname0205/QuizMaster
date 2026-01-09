"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { GameSession, Player } from "@/lib/types"

export default function WaitingRoom() {
    const [session, setSession] = useState<GameSession | null>(null)
    const [player, setPlayer] = useState<Player | null>(null)
    const [status, setStatus] = useState<string>("waiting")
    const router = useRouter()
    const params = useParams()
    const gameId = params.gameId as string
    const searchParams = useSearchParams()
    const playerId = searchParams.get("playerId")
    const supabase = createClient()

    useEffect(() => {
        if (!playerId) {
            toast.error("Missing player information")
            router.push("/join")
            return
        }

        // Fetch initial data
        const fetchSessionAndPlayer = async () => {
            // Fetch session
            const { data: sessionData, error: sessionError } = await supabase
                .from("game_sessions")
                .select(`*, quiz:quizzes(title)`)
                .eq("id", gameId)
                .single()

            if (sessionError || !sessionData) {
                toast.error("Game session not found")
                router.push("/join")
                return
            }

            setSession(sessionData)
            setStatus(sessionData.status)

            // Fetch player
            const { data: playerData, error: playerError } = await supabase
                .from("players")
                .select("*")
                .eq("id", playerId)
                .single()

            if (playerError || !playerData) {
                // Player might have been kicked
                toast.error("You are not in this game")
                router.push("/join")
                return
            }

            setPlayer(playerData)

            // If already playing, redirect
            if (sessionData.status === "playing") {
                router.push(`/play/${gameId}/game?playerId=${playerId}`)
            }
        }

        fetchSessionAndPlayer()

        // Subscribe to session changes
        const sessionChannel = supabase
            .channel(`game-session-${gameId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "game_sessions",
                    filter: `id=eq.${gameId}`,
                },
                (payload) => {
                    console.log("Session update received:", payload)
                    const newStatus = payload.new.status
                    if (newStatus === "playing") {
                        toast.success("Game starting!")
                        router.push(`/play/${gameId}/game?playerId=${playerId}`)
                    }
                    setStatus(newStatus)
                }
            )
            .subscribe((status) => {
                console.log("Session subscription status:", status)
            })

        // Polling fallback (every 3 seconds)
        const interval = setInterval(async () => {
            // Check game status
            const { data: sessionData } = await supabase
                .from("game_sessions")
                .select("status")
                .eq("id", gameId)
                .single()

            if (sessionData?.status === "playing") {
                router.push(`/play/${gameId}/game?playerId=${playerId}`)
            }

            // Check if player still exists (kick detection)
            const { error: playerCheckError } = await supabase
                .from("players")
                .select("id")
                .eq("id", playerId)
                .single()

            if (playerCheckError) {
                // Player record missing means they were kicked
                console.log("Player record missing (polling), redirecting...")
                toast.error("You have been removed from the game")
                router.push("/join")
            }
        }, 3000)

        // Subscribe to player deletion (kick)
        const playerChannel = supabase
            .channel(`player-kick-${playerId}`)
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "players",
                    filter: `id=eq.${playerId}`,
                },
                () => {
                    toast.error("You have been removed from the game")
                    router.push("/join")
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(sessionChannel)
            supabase.removeChannel(playerChannel)
            clearInterval(interval)
        }
    }, [gameId, playerId, router, supabase])

    if (!session || !player) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-primary/5 flex flex-col items-center justify-center p-4 text-center">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center">
                    <div className="text-6xl mb-4 animate-bounce">
                        {player.avatar}
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">You're in!</h1>
                    <p className="text-xl text-primary font-medium mt-1">{player.nickname}</p>
                </div>

                <Card className="bg-card border-border shadow-lg">
                    <CardContent className="pt-8 pb-8 space-y-6">
                        <div>
                            <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest mb-2">Current Quiz</p>
                            <h2 className="text-2xl font-bold text-foreground">{session.quiz?.title || "Quiz Master Game"}</h2>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-3 py-6 bg-muted/50 rounded-xl">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="font-medium text-muted-foreground">Waiting for host to start...</p>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Keep this screen open. The game will start automatically.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
