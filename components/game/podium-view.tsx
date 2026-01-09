"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { Trophy, Medal, ArrowRight } from "lucide-react"
import type { Player } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"

interface PodiumViewProps {
    players: Player[]
    onContinue: () => void
}

export function PodiumView({ players, onContinue }: PodiumViewProps) {
    const [sortedPlayers, setSortedPlayers] = useState<Player[]>([])

    useEffect(() => {
        // Sort players by score descending
        const sorted = [...players].sort((a, b) => b.total_score - a.total_score).slice(0, 3)
        setSortedPlayers(sorted)

        // Fire confetti
        const duration = 3 * 1000
        const end = Date.now() + duration

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#C0C0C0', '#CD7F32']
            })
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#C0C0C0', '#CD7F32']
            })

            if (Date.now() < end) {
                requestAnimationFrame(frame)
            }
        }
        frame()
    }, [players])

    const getBarHeight = (rank: number) => {
        switch (rank) {
            case 0: return "h-64" // 1st
            case 1: return "h-48" // 2nd
            case 2: return "h-32" // 3rd
            default: return "h-24"
        }
    }

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 0: return "bg-yellow-400 border-yellow-600 text-yellow-900" // Gold
            case 1: return "bg-gray-300 border-gray-500 text-gray-800" // Silver
            case 2: return "bg-orange-300 border-orange-500 text-orange-900" // Bronze
            default: return "bg-primary"
        }
    }

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 0: return <Trophy className="w-8 h-8 text-yellow-600 mb-2" />
            case 1: return <Medal className="w-6 h-6 text-gray-600 mb-2" />
            case 2: return <Medal className="w-6 h-6 text-orange-800 mb-2" />
            default: return null
        }
    }

    // Reorder for visual display: 2nd, 1st, 3rd
    const displayOrder = [1, 0, 2]

    // Only show available players (if less than 3)
    const displayPlayers = displayOrder
        .map(rank => ({ player: sortedPlayers[rank], rank }))
        .filter(item => item.player)

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-900 to-slate-900 w-full min-h-screen">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-12 tracking-wider uppercase drop-shadow-lg">
                The Champions
            </h1>

            <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-4xl mb-12">
                {displayPlayers.map(({ player, rank }) => (
                    <motion.div
                        key={player.id}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: rank * 0.2 + 0.5, duration: 0.5, type: "spring" }}
                        className="flex flex-col items-center"
                    >
                        {/* Avatar & Name */}
                        <div className="flex flex-col items-center mb-4 relative z-10">
                            <div className="text-6xl mb-2 drop-shadow-md animate-bounce">
                                {player.avatar}
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold border border-white/20">
                                {player.nickname}
                            </div>
                            <div className="text-white/80 font-mono mt-1 font-bold">
                                {player.total_score} pts
                            </div>
                        </div>

                        {/* Podium Bar */}
                        <div className={`w-24 md:w-32 rounded-t-lg shadow-2xl flex flex-col justify-end items-center pb-4 border-t-4 border-x-4 ${getBarHeight(rank)} ${getRankColor(rank)}`}>
                            {getRankIcon(rank)}
                            <span className="text-4xl font-black opacity-50">{rank + 1}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <Button
                onClick={onContinue}
                size="lg"
                className="text-xl px-8 py-6 rounded-full shadow-xl animate-pulse bg-white text-indigo-900 hover:bg-gray-100 hover:scale-105 transition-all"
            >
                View Full Results <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
        </div>
    )
}
