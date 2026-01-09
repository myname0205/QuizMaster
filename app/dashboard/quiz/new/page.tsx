import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuizEditor } from "@/components/dashboard/quiz-editor"

export default async function NewQuizPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return <QuizEditor userId={user.id} />
}
