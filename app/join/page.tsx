"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, User } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { AVATARS } from "@/lib/types"

export default function JoinPage() {
    const [gameCode, setGameCode] = useState("")
    const [nickname, setNickname] = useState("")
    const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!gameCode || gameCode.length !== 6) {
            toast.error("Please enter a valid 6-character game code")
            return
        }

        if (!nickname.trim()) {
            toast.error("Please enter a nickname")
            return
        }

        setIsLoading(true)

        try {
            // 1. Find the game session
            const { data: session, error: sessionError } = await supabase
                .from("game_sessions")
                .select("id, status")
                .eq("game_code", gameCode.toUpperCase())
                .single()

            if (sessionError || !session) {
                toast.error("Game not found. Check the code and try again.")
                setIsLoading(false)
                return
            }

            if (session.status !== "waiting") {
                toast.error("This game has already started or finished.")
                setIsLoading(false)
                return
            }

            // 2. Create player
            const { data: player, error: playerError } = await supabase
                .from("players")
                .insert({
                    game_session_id: session.id,
                    nickname: nickname.trim(),
                    avatar: selectedAvatar,
                    total_score: 0
                })
                .select()
                .single()

            if (playerError) throw playerError

            // 3. Redirect to waiting room
            toast.success("Joined game!")
            router.push(`/play/${session.id}?playerId=${player.id}`)

        } catch (error) {
            console.error(error)
            toast.error("Failed to join game")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Image src="/quidle-logo.svg" alt="Quidle" width={52} height={52} />
                        <span
                            className="font-[family-name:var(--font-brand)] text-3xl font-bold"
                            style={{ background: "linear-gradient(135deg,#E040FB,#00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                        >
                            Quidle
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Join a Game</h1>
                    <p className="text-muted-foreground mt-2">Enter the code provided by your host</p>
                </div>

                <Card className="bg-card border-border">
                    <CardContent className="pt-6">
                        <form onSubmit={handleJoin} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="gameCode">Game Code</Label>
                                <div className="relative">
                                    <Input
                                        id="gameCode"
                                        placeholder="e.g. A1B2C3"
                                        className="text-center text-2xl tracking-widest uppercase h-14 font-bold bg-input border-border"
                                        value={gameCode}
                                        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                                        maxLength={6}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nickname">Nickname</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="nickname"
                                            placeholder="Enter your name"
                                            className="pl-9 bg-input border-border"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Choose Avatar</Label>
                                    <div className="grid grid-cols-8 gap-2">
                                        {AVATARS.slice(0, 8).map((avatar) => (
                                            <button
                                                key={avatar}
                                                type="button"
                                                onClick={() => setSelectedAvatar(avatar)}
                                                className={`text-2xl p-1 rounded-lg transition-all ${selectedAvatar === avatar
                                                    ? "bg-primary/20 ring-2 ring-primary scale-110"
                                                    : "hover:bg-muted"
                                                    }`}
                                            >
                                                {avatar}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
                                {isLoading ? "Joining..." : "Join Game"}
                                {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
