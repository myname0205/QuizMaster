import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Download, AlertTriangle, CheckCircle, XCircle, Loader2, Clock } from "lucide-react"
import type { Player, PlayerAnswer, Quiz } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { saveAs } from "file-saver"


interface GameReportViewProps {
    players: Player[]
    answers: PlayerAnswer[]
    quiz: Quiz
    onBackToDashboard: () => void
}

export function GameReportView({ players, answers, quiz, onBackToDashboard }: GameReportViewProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [downloadFilename, setDownloadFilename] = useState<string>("")

    // Calculate stats
    const stats = useMemo(() => {
        // Calculate stats based on TOTAL players, not just answers (unanswered = wrong)
        const totalPossibleAnswers = quiz.questions ? quiz.questions.length * players.length : 0
        const totalCorrect = answers.filter(a => a.is_correct).length
        const accuracy = totalPossibleAnswers > 0 ? Math.round((totalCorrect / totalPossibleAnswers) * 100) : 0

        // Find toughest question
        const questionStats = quiz.questions?.map(q => {
            const qAnswers = answers.filter(a => a.question_id === q.id)
            const qCorrect = qAnswers.filter(a => a.is_correct).length
            // Accuracy is based on ALL players
            const qAccuracy = players.length > 0 ? (qCorrect / players.length) : 0

            return {
                question: q,
                accuracy: qAccuracy
            }
        }) || []

        // Sort by accuracy (lowest first)
        const sortedStats = questionStats.sort((a, b) => a.accuracy - b.accuracy)
        const candidate = sortedStats[0]

        // Hide toughest question if everyone got it right (accuracy == 1)
        const toughestQuestion = (candidate && candidate.accuracy < 1) ? candidate : null

        return {
            accuracy,
            toughestQuestion
        }
    }, [answers, quiz.questions, players.length])

    const chartData = [
        { name: "Correct", value: stats.accuracy, color: "#22c55e" },
        { name: "Incorrect", value: 100 - stats.accuracy, color: "#ef4444" },
    ]

    const handleExportPDF = async () => {
        setIsExporting(true)
        toast.info("Generating PDF...")

        try {
            const { jsPDF } = await import("jspdf")
            const autoTable = (await import("jspdf-autotable")).default

            const doc = new jsPDF()

            // --- Theme Colors ---
            // Using RGB values roughly matching the app's primary/secondary
            const PRIMARY_COLOR: [number, number, number] = [219, 39, 119] // Pink-ish
            const SECONDARY_COLOR: [number, number, number] = [147, 51, 234] // Purple-ish
            const ACCENT_COLOR: [number, number, number] = [34, 197, 94] // Green
            const TEXT_COLOR: [number, number, number] = [40, 40, 40]
            const LIGHT_TEXT: [number, number, number] = [255, 255, 255]

            // --- 1. Header Section ---
            // Draw colorful header bar
            doc.setFillColor(...PRIMARY_COLOR)
            doc.rect(0, 0, 210, 40, "F")

            // Title
            doc.setFontSize(24)
            doc.setTextColor(...LIGHT_TEXT)
            doc.text("Game Report", 14, 20)

            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.text(quiz.title || "Untitled Quiz", 14, 30)

            // Date
            const dateStr = new Date().toLocaleDateString()
            doc.setFontSize(10)
            doc.setFont("helvetica", "normal")
            doc.text(`Generated: ${dateStr}`, 14, 36)

            // --- 2. Summary Cards ---
            let startY = 55

            // Card 1: Class Accuracy
            doc.setDrawColor(200, 200, 200)
            doc.setFillColor(255, 255, 255)
            doc.roundedRect(14, startY, 85, 30, 3, 3, "FD")

            // Icon placeholder / Title
            doc.setTextColor(...TEXT_COLOR)
            doc.setFontSize(11)
            doc.text("Avg. Accuracy", 20, startY + 10)

            // Value
            doc.setFontSize(22)
            doc.setFont("helvetica", "bold")
            const accColor: [number, number, number] = stats.accuracy >= 70 ? ACCENT_COLOR : stats.accuracy >= 40 ? [234, 179, 8] : [239, 68, 68]
            doc.setTextColor(...accColor)
            doc.text(`${stats.accuracy}%`, 20, startY + 22)

            // Card 2: Toughest Question
            doc.setDrawColor(200, 200, 200)
            doc.setFillColor(255, 255, 255)
            doc.roundedRect(105, startY, 90, 30, 3, 3, "FD")

            doc.setTextColor(...TEXT_COLOR)
            doc.setFontSize(11)
            doc.setFont("helvetica", "normal")
            doc.text("Toughest Question", 111, startY + 10)

            if (stats.toughestQuestion) {
                doc.setFontSize(9)
                doc.setTextColor(80, 80, 80)

                // Text wrapping for toughest question
                const tqText = stats.toughestQuestion.question.question_text
                const splitText = doc.splitTextToSize(tqText, 80)
                // Limit to 2 lines to fit in box
                const visibleText = splitText.length > 2 ? [splitText[0], splitText[1] + "..."] : splitText

                doc.text(visibleText, 111, startY + 17)

                // Accuracy for this question
                doc.setFontSize(10)
                doc.setFont("helvetica", "bold")
                doc.setTextColor(239, 68, 68) // Red
                doc.text(`${Math.round(stats.toughestQuestion.accuracy * 100)}% Correct`, 111, startY + 27)
            } else {
                doc.setFontSize(10)
                doc.text("N/A - Good job!", 111, startY + 20)
            }


            // --- 3. Leaderboard Table ---
            const leaderboardY = startY + 40
            doc.setFontSize(14)
            doc.setTextColor(...PRIMARY_COLOR)
            doc.setFont("helvetica", "bold")
            doc.text("Leaderboard", 14, leaderboardY)

            const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score)
            const playerRows = sortedPlayers.map((p, i) => [
                i + 1,
                p.nickname,
                `${p.total_score} pts`,
                answers.filter(a => a.player_id === p.id && a.is_correct).length
            ])

            autoTable(doc, {
                startY: leaderboardY + 5,
                head: [["Rank", "Player", "Score", "Correct"]],
                body: playerRows,
                theme: 'grid',
                headStyles: { fillColor: PRIMARY_COLOR, textColor: LIGHT_TEXT, fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 3, textColor: TEXT_COLOR },
                alternateRowStyles: { fillColor: [249, 250, 251] }
            })

            // --- 4. Detailed Question Analysis ---
            // @ts-ignore
            let finalY = (doc as any).lastAutoTable.finalY + 15

            doc.setFontSize(14)
            doc.setTextColor(...PRIMARY_COLOR)
            doc.setFont("helvetica", "bold")
            doc.text("Detailed Question Analysis", 14, finalY)
            finalY += 8

            // Prepare detailed rows
            const questionDetailedRows = (quiz.questions || []).map((q, i) => {
                const qAnswers = answers.filter(a => a.question_id === q.id)
                const correctCount = qAnswers.filter(a => a.is_correct).length
                const accuracy = qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0

                // Build breakdown string
                let breakdownText = ""

                // Correct Options match
                const correctOptions = q.answer_options?.filter(o => o.is_correct) || []
                correctOptions.forEach(opt => {
                    const choosers = qAnswers.filter(a =>
                        q.question_type === 'MULTIPLE_SELECT'
                            ? a.answer_option_ids?.includes(opt.id)
                            : a.answer_option_id === opt.id
                    ).map(a => players.find(p => p.id === a.player_id)?.nickname).filter(Boolean)

                    breakdownText += `[+] ${opt.option_text}: ${choosers.join(", ") || "(None)"}\n`
                })

                // Incorrect Options match
                const incorrectOptions = q.answer_options?.filter(o => !o.is_correct) || []
                incorrectOptions.forEach(opt => {
                    const choosers = qAnswers.filter(a =>
                        q.question_type === 'MULTIPLE_SELECT'
                            ? a.answer_option_ids?.includes(opt.id)
                            : a.answer_option_id === opt.id
                    ).map(a => players.find(p => p.id === a.player_id)?.nickname).filter(Boolean)

                    if (choosers.length > 0) {
                        breakdownText += `[-] ${opt.option_text}: ${choosers.join(", ")}\n`
                    }
                })

                // Did not answer
                const answeredIds = new Set(qAnswers.map(a => a.player_id))
                const noAnswer = players.filter(p => !answeredIds.has(p.id)).map(p => p.nickname)
                if (noAnswer.length > 0) {
                    breakdownText += `[!] No Answer: ${noAnswer.join(", ")}`
                }

                return [
                    `Q${i + 1}`,
                    q.question_text,
                    `${accuracy}%`,
                    breakdownText.trim()
                ]
            })

            autoTable(doc, {
                startY: finalY,
                head: [["#", "Question", "Acc.", "Detailed Breakdown"]],
                body: questionDetailedRows,
                theme: 'grid',
                headStyles: { fillColor: SECONDARY_COLOR, textColor: LIGHT_TEXT },
                styles: { fontSize: 9, cellPadding: 4, valign: 'top' },
                columnStyles: {
                    0: { cellWidth: 20, fontStyle: 'bold' },
                    1: { cellWidth: 50, fontStyle: 'bold' },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 'auto' } // Takes remaining space for details
                },
                didParseCell: (data) => {
                    // Colorize the breakdown column text slightly if needed? 
                    // autoTable doesn't support rich text easily, but we can structure nicely.
                }
            })

            // Meta Footer
            const pageCount = doc.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(8)
                doc.setTextColor(150)
                doc.text(`Page ${i} of ${pageCount} - Quidle Report`, 105, 290, { align: 'center' })
            }

            // Save
            const safeTitle = (quiz.title || "Game_Report").replace(/[^a-z0-9_-]/gi, "_")
            const filename = `Report_${safeTitle}_${dateStr.replace(/\//g, "-")}.pdf`
            doc.save(filename)

            toast.success("PDF Downloaded!")
        } catch (err) {
            console.error("PDF Export Error:", err)
            toast.error("Failed to generate PDF")
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportCSV = () => {
        setIsExporting(true)
        setDownloadUrl(null)
        setDownloadFilename("")

        try {
            // Header
            let csvContent = "Rank,Player Name,Total Score,Correct Answers,Accuracy %\n"

            // Rows
            const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score)

            sortedPlayers.forEach((player, index) => {
                const pAnswers = answers.filter(a => a.player_id === player.id)
                const correct = pAnswers.filter(a => a.is_correct).length
                const totalQuestions = quiz.questions?.length || 0
                const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0

                // Escape quotes if needed
                const name = player.nickname.replace(/"/g, '""')

                const row = `${index + 1},"${name}",${player.total_score},${correct},${accuracy}%`
                csvContent += row + "\n"
            })

            // Use Data URI to bypass Blob security restrictions
            const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

            const dateStr = new Date().toISOString().split("T")[0]
            const safeTitle = (quiz.title || "Game_Report").replace(/[^a-z0-9_-]/gi, "_")
            const filename = `Report_${safeTitle}_${dateStr}.csv`

            setDownloadUrl(url)
            setDownloadFilename(filename)
            toast.success("CSV Ready!")
        } catch (err) {
            console.error(err)
            toast.error("Failed to generate CSV")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-muted/20 p-8 flex flex-col items-center">
            <div className="w-full max-w-6xl space-y-10">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Game Report: {quiz.title}</h1>
                    <div className="flex gap-4 export-exclude">
                        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
                            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            {isExporting ? "Generating..." : "Export PDF"}
                        </Button>
                        <Button onClick={onBackToDashboard}>
                            Back to Dashboard
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Accuracy Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Class Accuracy</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-5xl font-bold">{stats.accuracy}%</span>
                                <span className="text-muted-foreground text-sm">Correct</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Toughest Question */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Toughest Question</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats.toughestQuestion && (
                                <>
                                    <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-start gap-4">
                                        <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                                        <div>
                                            <p className="font-medium text-lg mb-2">
                                                {stats.toughestQuestion.question.question_text}
                                            </p>
                                            <div className="text-red-600 font-bold">
                                                Only {Math.round(stats.toughestQuestion.accuracy * 100)}% answered correctly
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        Consider reviewing this topic in your next class.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Question Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Question Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {quiz.questions?.map((question, i) => {
                                const qAnswers = answers.filter(a => a.question_id === question.id)
                                const correctCount = qAnswers.filter(a => a.is_correct).length
                                const accuracy = qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0

                                const correctOptions = question.answer_options?.filter(o => o.is_correct) || []
                                const incorrectOptions = question.answer_options?.filter(o => !o.is_correct) || []

                                // Find players who didn't answer
                                const answeredPlayerIds = new Set(qAnswers.map(a => a.player_id))
                                const unansweredPlayers = players.filter(p => !answeredPlayerIds.has(p.id))

                                return (
                                    <div key={question.id} className="border border-border rounded-lg p-6 bg-card">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="font-bold text-xl mb-2">Q{i + 1}: {question.question_text}</h3>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("px-3 py-1 rounded-full text-sm font-bold",
                                                        accuracy >= 70 ? "bg-green-100 text-green-800" :
                                                            accuracy >= 40 ? "bg-yellow-100 text-yellow-800" :
                                                                "bg-red-100 text-red-800"
                                                    )}>
                                                        {accuracy}% Accuracy
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">{qAnswers.length} responses</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Answer Distribution */}
                                        <div className="space-y-4">
                                            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Results Breakdown</div>

                                            {/* Correct Answers */}
                                            {correctOptions.map(option => {
                                                const choosers = qAnswers.filter(a => {
                                                    if (question.question_type === 'MULTIPLE_SELECT') {
                                                        return a.answer_option_ids?.includes(option.id)
                                                    }
                                                    return a.answer_option_id === option.id
                                                })

                                                return (
                                                    <div key={option.id} className="border border-green-200 bg-green-100 dark:bg-green-900/20 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                            <span className="font-bold text-green-900 dark:text-green-300">{option.option_text}</span>
                                                            <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full ml-2">CORRECT ANSWER</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pl-7">
                                                            {choosers.map(a => {
                                                                const p = players.find(p => p.id === a.player_id)
                                                                return p ? (
                                                                    <div key={a.id} className="flex items-center gap-1.5 bg-background border border-green-200 dark:border-green-800 shadow-sm px-2 py-1 rounded-md text-sm">
                                                                        <span>{p.avatar}</span>
                                                                        <span className="font-medium">{p.nickname}</span>
                                                                    </div>
                                                                ) : null
                                                            })}
                                                            {choosers.length === 0 && (
                                                                <span className="text-muted-foreground text-sm italic">No one selected this.</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {/* Incorrect Options */}
                                            {incorrectOptions.map(option => {
                                                const choosers = qAnswers.filter(a => {
                                                    if (question.question_type === 'MULTIPLE_SELECT') {
                                                        return a.answer_option_ids?.includes(option.id)
                                                    }
                                                    return a.answer_option_id === option.id
                                                })

                                                if (choosers.length === 0) return null

                                                return (
                                                    <div key={option.id} className="border border-border bg-muted/20 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <XCircle className="w-5 h-5 text-muted-foreground" />
                                                            <span className="font-medium text-foreground">{option.option_text}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pl-7">
                                                            {choosers.map(a => {
                                                                const p = players.find(p => p.id === a.player_id)
                                                                return p ? (
                                                                    <div key={a.id} className="flex items-center gap-1.5 bg-background border border-border shadow-sm px-2 py-1 rounded-md text-sm opacity-75">
                                                                        <span>{p.avatar}</span>
                                                                        <span>{p.nickname}</span>
                                                                    </div>
                                                                ) : null
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {/* Time Up / Did Not Answer */}
                                            {unansweredPlayers.length > 0 && (
                                                <div className="border border-yellow-200 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                                        <span className="font-bold text-yellow-900 dark:text-yellow-300">Time Up / No Answer</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pl-7">
                                                        {unansweredPlayers.map(p => (
                                                            <div key={p.id} className="flex items-center gap-1.5 bg-background border border-yellow-200 dark:border-yellow-800 shadow-sm px-2 py-1 rounded-md text-sm">
                                                                <span>{p.avatar}</span>
                                                                <span className="font-medium">{p.nickname}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Player Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Player</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...players].sort((a, b) => b.total_score - a.total_score).map((player, index) => (
                                    <TableRow key={player.id}>
                                        <TableCell className="font-medium">#{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{player.avatar}</span>
                                                {player.nickname}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{player.total_score}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
