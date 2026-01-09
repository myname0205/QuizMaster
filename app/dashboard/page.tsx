import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch user's quizzes
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(count)
    `)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // Fetch past game sessions
  const { data: pastSessions } = await supabase
    .from("game_sessions")
    .select(`
      *,
      quiz:quizzes(title),
      players(count)
    `)
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return <DashboardContent user={user} profile={profile} quizzes={quizzes || []} pastSessions={pastSessions || []} />
}
