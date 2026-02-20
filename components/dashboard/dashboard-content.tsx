"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import type { Profile, Quiz } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Plus, Play, Edit, Trash2, MoreVertical, LogOut, FileText, Calendar, Users as UsersIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DashboardContentProps {
  user: User
  profile: Profile | null
  quizzes: (Quiz & { questions: { count: number }[] })[]
  pastSessions: any[] // Using any[] for now to match the fetch result shape, can be properly typed if needed
}

export function DashboardContent({ user, profile, quizzes, pastSessions }: DashboardContentProps) {
  const router = useRouter()
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const [reportToDelete, setReportToDelete] = useState<string | null>(null)

  // NEW: Executed by the Report Alert Dialog
  const confirmDeleteReport = async () => {
    if (!reportToDelete) return
    const sessionId = reportToDelete

    toast.info("Deleting report...")
    const supabase = createClient()

    try {
      console.log("Starting deletion for session:", sessionId)

      // 1. Get players first (to delete their answers)
      const { data: sessionPlayers, error: fetchError } = await supabase
        .from("players")
        .select("id")
        .eq("game_session_id", sessionId)

      if (fetchError) throw fetchError

      if (sessionPlayers && sessionPlayers.length > 0) {
        const playerIds = sessionPlayers.map(p => p.id)

        // 2. Delete answers
        const { error: answerError } = await supabase
          .from("player_answers")
          .delete()
          .in("player_id", playerIds)

        if (answerError) throw answerError

        // 3. Delete players
        const { error: playerError } = await supabase
          .from("players")
          .delete()
          .eq("game_session_id", sessionId)

        if (playerError) throw playerError
      }

      // 4. Delete game session
      const { error: sessionError } = await supabase
        .from("game_sessions")
        .delete()
        .eq("id", sessionId)

      if (sessionError) throw sessionError

      toast.success("Report deleted")
      router.refresh()
    } catch (error: any) {
      console.error("Error deleting session:", error)
      toast.error("Failed to delete report: " + (error.message || "Unknown error"))
    }
    setReportToDelete(null)
  }

  // OLD: Triggered by the menu item
  const handleDeleteQuizClick = (e: React.MouseEvent | Event, quizId: string) => {
    e.preventDefault()
    // e.stopPropagation() // Not strictly needed if we just open a controlled dialog
    setQuizToDelete(quizId)
  }

  // NEW: Executed by the Alert Dialog
  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return

    const supabase = createClient()

    // Soft delete: Mark as deleted but keep data for reports
    const { error } = await supabase
      .from("quizzes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", quizToDelete)

    if (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete quiz")
    } else {
      toast.success("Quiz deleted")
      router.refresh()
    }

    setQuizToDelete(null)
  }

  const handleStartGame = async (quizId: string) => {
    const supabase = createClient()

    // Generate a unique 6-character game code
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data, error } = await supabase
      .from("game_sessions")
      .insert({
        quiz_id: quizId,
        host_id: user.id,
        game_code: gameCode,
        status: "waiting",
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to start game")
      return
    }

    router.push(`/host/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/quidle-logo.svg" alt="Quidle logo" width={36} height={36} />
            <span className="font-[family-name:var(--font-brand)] text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quidle</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile?.display_name || user.email}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="quizzes" className="w-full">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your quizzes and view past results</p>
            </div>
            <div className="flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
                <TabsTrigger value="reports">Past Reports</TabsTrigger>
              </TabsList>
              <Link href="/dashboard/quiz/new">
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Quiz
                </Button>
              </Link>
            </div>
          </div>

          <TabsContent value="quizzes" className="mt-0">
            {quizzes.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No quizzes yet</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-sm">
                    Create your first quiz to start engaging your students with interactive learning experiences.
                  </p>
                  <Link href="/dashboard/quiz/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Quiz
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-foreground line-clamp-1">{quiz.title}</CardTitle>
                          <CardDescription className="line-clamp-2 mt-1">
                            {quiz.description || "No description"}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/quiz/${quiz.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Quiz
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => handleDeleteQuizClick(e, quiz.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{quiz.questions?.[0]?.count || 0} questions</span>
                        <Button size="sm" onClick={() => handleStartGame(quiz.id)}>
                          <Play className="w-4 h-4 mr-1" />
                          Start Game
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            {pastSessions.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-secondary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No past games yet</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-sm">
                    Host a game to see analytics and reports here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pastSessions.map((session) => (
                  <Card key={session.id} className="bg-card border-border">
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="grid gap-1">
                        <h3 className="font-semibold text-foreground text-lg">{session.quiz?.title || "Untitled Quiz"}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(session.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UsersIcon className="w-4 h-4" />
                            <span>{session.players?.[0]?.count || 0} players</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/report/${session.id}`}>
                          <Button variant="outline" size="sm">View Results</Button>
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive px-2"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setReportToDelete(session.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="text-xs font-bold">DELETE</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!quizToDelete} onOpenChange={(open) => !open && setQuizToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the quiz from your dashboard.
              (Past reports will still be accessible).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuiz} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this game report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReport} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
