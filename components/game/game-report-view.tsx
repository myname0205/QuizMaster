import { useRef, useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Download, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react"
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
    const reportRef = useRef<HTMLDivElement>(null)
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
        if (!reportRef.current) return

        setIsExporting(true)
        setDownloadUrl(null) // Reset previous
        setDownloadFilename("")
        toast.info("Generating PDF...")

        try {
            const { toCanvas } = await import("html-to-image")
            const { jsPDF } = await import("jspdf")

            // Render DOM → Canvas (NO auto download)
            const canvas = await toCanvas(reportRef.current, {
                cacheBust: true,
                pixelRatio: 2.5, // High quality
                backgroundColor: "#f8fafc",
                filter: (node) => {
                    // Exclude elements with the 'export-exclude' class
                    if (node instanceof HTMLElement && node.classList.contains("export-exclude")) {
                        return false
                    }
                    return true
                }
            })

            const imgData = canvas.toDataURL("image/png")

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            })

            const imgWidth = 210
            const pageHeight = 297

            const imgHeight = (canvas.height * imgWidth) / canvas.width

            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position -= pageHeight
                pdf.addPage()
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            const dateStr = new Date().toISOString().split("T")[0]
            const safeTitle = (quiz.title || "Game_Report").replace(/[^a-z0-9_-]/gi, "_")
            const filename = `Report_${safeTitle}_${dateStr}.pdf`

            // Use Data URI to bypass Blob security restrictions / filename stripping
            const url = pdf.output('datauristring')

            // Programmatic click to trigger download immediately
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success("PDF Downloaded!")
        } catch (err) {
            console.error(err)
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
            <div className="w-full max-w-6xl space-y-10" ref={reportRef}>
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
                                const correctAnswer = question.answer_options?.find(o => o.is_correct)

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

                                            {/* Correct Answer First */}
                                            {correctAnswer && (
                                                <div className="border border-green-200 bg-green-50/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <span className="font-bold text-green-900">{correctAnswer.option_text}</span>
                                                        <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-2">CORRECT ANSWER</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pl-7">
                                                        {qAnswers.filter(a => a.answer_option_id === correctAnswer.id).map(a => {
                                                            const p = players.find(p => p.id === a.player_id)
                                                            return p ? (
                                                                <div key={a.id} className="flex items-center gap-1.5 bg-white border border-green-100 shadow-sm px-2 py-1 rounded-md text-sm">
                                                                    <span>{p.avatar}</span>
                                                                    <span className="font-medium">{p.nickname}</span>
                                                                </div>
                                                            ) : null
                                                        })}
                                                        {qAnswers.filter(a => a.answer_option_id === correctAnswer.id).length === 0 && (
                                                            <span className="text-muted-foreground text-sm italic">No one selected this.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Incorrect Options */}
                                            {question.answer_options?.filter(o => !o.is_correct).map(option => {
                                                const choosers = qAnswers.filter(a => a.answer_option_id === option.id)
                                                if (choosers.length === 0) return null // Hide if no one picked it? Or show 0? Let's hide to save space or show greyed out.

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
