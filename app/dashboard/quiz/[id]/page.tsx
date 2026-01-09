import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuizEditor } from "@/components/dashboard/quiz-editor"

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Fetch quiz with questions and answers
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(`
      *,
      questions(
        *,
        answer_options(*)
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!quiz) {
    notFound()
  }

  // Sort questions by order_index
  if (quiz.questions) {
    quiz.questions.sort((a, b) => a.order_index - b.order_index)
    quiz.questions.forEach((q) => {
      if (q.answer_options) {
        q.answer_options.sort((a, b) => a.order_index - b.order_index)
      }
    })
  }

  return <QuizEditor userId={user.id} existingQuiz={quiz} />
}
