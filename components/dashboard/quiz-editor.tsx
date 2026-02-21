"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { Quiz, Question, AnswerOption } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Zap, ArrowLeft, Plus, Trash2, GripVertical, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface QuestionDraft {
  id?: string
  question_text: string
  question_type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT"
  time_limit: number | string
  points: number | string
  order_index: number
  answer_options: AnswerOptionDraft[]
}

interface AnswerOptionDraft {
  id?: string
  option_text: string
  is_correct: boolean
  order_index: number
}

interface QuizEditorProps {
  userId: string
  existingQuiz?: Quiz & { questions: (Question & { answer_options: AnswerOption[] })[] }
}

export function QuizEditor({ userId, existingQuiz }: QuizEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(existingQuiz?.title || "")
  const [description, setDescription] = useState(existingQuiz?.description || "")
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    existingQuiz?.questions?.map((q, idx) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type || "MULTIPLE_CHOICE",
      time_limit: q.time_limit,
      points: q.points,
      order_index: idx,
      answer_options:
        q.answer_options?.map((a, aidx) => ({
          id: a.id,
          option_text: a.option_text,
          is_correct: a.is_correct,
          order_index: aidx,
        })) || [],
    })) || [],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Track changes for unsaved warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Mark as changed when editing
  useEffect(() => {
    // Only set to true if there are actual changes from the initial state
    const initialTitle = existingQuiz?.title || ""
    const initialDescription = existingQuiz?.description || ""
    const initialQuestions = existingQuiz?.questions?.map((q, idx) => ({
      id: q.id,
      question_text: q.question_text,
      time_limit: q.time_limit,
      points: q.points,
      order_index: idx,
      answer_options:
        q.answer_options?.map((a, aidx) => ({
          id: a.id,
          option_text: a.option_text,
          is_correct: a.is_correct,
          order_index: aidx,
        })) || [],
    })) || []

    const isTitleChanged = title !== initialTitle
    const isDescriptionChanged = description !== initialDescription
    const isQuestionsChanged = JSON.stringify(questions) !== JSON.stringify(initialQuestions)

    if (isTitleChanged || isDescriptionChanged || isQuestionsChanged) {
      setHasUnsavedChanges(true)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [title, description, questions, existingQuiz])


  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_type: "MULTIPLE_CHOICE",
        time_limit: 30,
        points: 1000,
        order_index: questions.length,
        answer_options: [
          { option_text: "", is_correct: true, order_index: 0 },
          { option_text: "", is_correct: false, order_index: 1 },
          { option_text: "", is_correct: false, order_index: 2 },
          { option_text: "", is_correct: false, order_index: 3 },
        ],
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i })))
  }

  const updateQuestion = (index: number, field: keyof QuestionDraft, value: any) => {
    const updated = [...questions]

    // Handle switching logic
    if (field === "question_type" && value !== updated[index].question_type) {
      // Reset options based on new type
      if (value === "TRUE_FALSE") {
        updated[index].answer_options = [
          { option_text: "True", is_correct: true, order_index: 0 },
          { option_text: "False", is_correct: false, order_index: 1 }
        ]
      } else if (updated[index].question_type === "TRUE_FALSE") {
        // Switching FROM T/F to others, reset to default 4 blanks
        updated[index].answer_options = [
          { option_text: "", is_correct: true, order_index: 0 },
          { option_text: "", is_correct: false, order_index: 1 },
          { option_text: "", is_correct: false, order_index: 2 },
          { option_text: "", is_correct: false, order_index: 3 },
        ]
      }
    }

    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateAnswerOption = (
    qIndex: number,
    aIndex: number,
    field: keyof AnswerOptionDraft,
    value: string | boolean,
  ) => {
    const updated = [...questions]
    const answers = [...updated[qIndex].answer_options]

    const questionType = updated[qIndex].question_type

    if (field === "is_correct" && value === true) {
      if (questionType === "MULTIPLE_SELECT") {
        // Allow multiple correct
        answers[aIndex] = { ...answers[aIndex], is_correct: true }
      } else {
        // Only one correct answer (MC or T/F)
        answers.forEach((a, i) => {
          a.is_correct = i === aIndex
        })
      }
    } else if (field === "is_correct") {
      // Explicitly cast or check value type for TS satisfaction
      answers[aIndex] = { ...answers[aIndex], is_correct: Boolean(value) }
    } else if (field === "option_text") {
      answers[aIndex] = { ...answers[aIndex], option_text: String(value) }
    } else {
      // Fallback for other fields if any
      answers[aIndex] = { ...answers[aIndex], [field]: value }
    }

    updated[qIndex].answer_options = answers
    setQuestions(updated)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a quiz title")
      return
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question")
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) {
        toast.error(`Question ${i + 1} is empty`)
        return
      }
      if (q.answer_options.filter((a) => a.option_text.trim()).length < 2) {
        toast.error(`Question ${i + 1} needs at least 2 answer options`)
        return
      }
      if (!q.answer_options.some((a) => a.is_correct)) {
        toast.error(`Question ${i + 1} needs a correct answer`)
        return
      }
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      let quizId = existingQuiz?.id

      if (existingQuiz) {
        // Update existing quiz
        const { error } = await supabase
          .from("quizzes")
          .update({ title, description, updated_at: new Date().toISOString() })
          .eq("id", existingQuiz.id)

        if (error) throw error

        // Delete existing questions (cascade will delete answers)
        await supabase.from("questions").delete().eq("quiz_id", existingQuiz.id)
      } else {
        // Create new quiz
        const { data, error } = await supabase
          .from("quizzes")
          .insert({ title, description, user_id: userId })
          .select()
          .single()

        if (error) throw error
        quizId = data.id
      }

      // Insert all questions
      for (const q of questions) {
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quizId,
            question_text: q.question_text,
            question_type: q.question_type,
            time_limit: Number(q.time_limit) || 30,
            points: Number(q.points) || 100,
            order_index: q.order_index,
          })
          .select()
          .single()

        if (questionError) throw questionError

        // Insert answer options
        const { error: answersError } = await supabase.from("answer_options").insert(
          q.answer_options
            .filter((a) => a.option_text.trim())
            .map((a) => ({
              question_id: questionData.id,
              option_text: a.option_text,
              is_correct: a.is_correct,
              order_index: a.order_index,
            })),
        )

        if (answersError) throw answersError
      }

      toast.success(existingQuiz ? "Quiz updated successfully" : "Quiz created successfully")
      setHasUnsavedChanges(false)
      router.push("/dashboard")
    } catch (error) {
      toast.error("Failed to save quiz")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowUnsavedWarning(true)
                } else {
                  router.push("/dashboard")
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Quidle" width={32} height={32} />
              <span className="font-semibold text-foreground">{existingQuiz ? "Edit Quiz" : "New Quiz"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-transparent" onClick={() => setShowAIModal(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : existingQuiz ? "Update Quiz" : "Create Quiz"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quiz Details */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Science Quiz: Photosynthesis"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this quiz about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-input border-border resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Questions ({questions.length})</h2>
            <Button variant="outline" className="bg-transparent" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No questions yet</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="bg-transparent" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                  <Button onClick={() => setShowAIModal(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, qIndex) => (
              <Card key={qIndex} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="cursor-move text-muted-foreground">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">Question {qIndex + 1}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      placeholder="Enter your question..."
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                      className="bg-input border-border resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={question.question_type}
                      onValueChange={(val) => updateQuestion(qIndex, "question_type", val)}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MULTIPLE_CHOICE">Multiple Choice (Single Answer)</SelectItem>
                        <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                        <SelectItem value="MULTIPLE_SELECT">Multiple Select (Multiple Answers)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Time Limit (seconds)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        value={question.time_limit}
                        onChange={(e) => updateQuestion(qIndex, "time_limit", e.target.value === "" ? "" : Number(e.target.value))}
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={10}
                        max={1000}
                        step={10}
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, "points", e.target.value === "" ? "" : Number(e.target.value))}
                        className="bg-input border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Answer Options (check to mark correct)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {question.answer_options.map((option, aIndex) => {
                        // Removed dynamic chart colors for selected state favor of green
                        return (
                          <div
                            key={aIndex}
                            className={cn(
                              "relative rounded-lg border-2 p-3 transition-all flex items-center gap-3 shadow-sm",
                              option.is_correct
                                ? "border-green-500 bg-green-500/20 shadow-green-500/10"
                                : "border-muted-foreground/50 bg-card hover:border-foreground hover:shadow-md",
                            )}
                          >
                            <Checkbox
                              id={`q${qIndex}-a${aIndex}`}
                              checked={option.is_correct}
                              onCheckedChange={(checked) => updateAnswerOption(qIndex, aIndex, "is_correct", !!checked)}
                              className={cn(
                                "h-5 w-5 border-2",
                                option.is_correct
                                  ? "data-[state=checked]:bg-green-600 data-[state=checked]:text-white border-green-600"
                                  : "border-muted-foreground"
                              )}
                            />
                            <Input
                              placeholder={question.question_type === "TRUE_FALSE" ? `Option ${aIndex + 1}` : `Option ${aIndex + 1}`}
                              value={option.option_text}
                              onChange={(e) => {
                                updateAnswerOption(qIndex, aIndex, "option_text", e.target.value)
                              }}
                              disabled={question.question_type === "TRUE_FALSE"}
                              className={cn(
                                "border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto",
                                question.question_type === "TRUE_FALSE" && "opacity-100 font-bold"
                              )}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {questions.length > 0 && (
            <Button variant="outline" className="w-full bg-transparent" onClick={addQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Another Question
            </Button>
          )}
        </div>
      </main>

      {/* AI Generation Modal */}
      {showAIModal && (
        <AIGeneratorModal
          onClose={() => setShowAIModal(false)}
          onGenerate={(generatedQuestions) => {
            setQuestions([
              ...questions,
              ...generatedQuestions.map((q, idx) => ({
                ...q,
                order_index: questions.length + idx,
              })),
            ])
            setShowAIModal(false)
          }}
        />
      )}

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Unsaved Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                You have unsaved changes. Are you sure you want to leave without saving?
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowUnsavedWarning(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setHasUnsavedChanges(false)
                    setShowUnsavedWarning(false)
                    router.push("/dashboard")
                  }}
                >
                  Leave Without Saving
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface AIGeneratorModalProps {
  onClose: () => void
  onGenerate: (questions: QuestionDraft[]) => void
}

function AIGeneratorModal({ onClose, onGenerate }: AIGeneratorModalProps) {
  const [mode, setMode] = useState<"topic" | "text">("topic")
  const [input, setInput] = useState("")
  const [numQuestions, setNumQuestions] = useState(5)
  const [questionType, setQuestionType] = useState<"MIXED" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT">("MIXED")
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingText, setLoadingText] = useState("Generating Question")

  // Animation effect for loading dots
  useEffect(() => {
    if (!isGenerating) return;

    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      setLoadingText(`Generating Questions${".".repeat(dots)}`);
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.error("Please enter a topic or text")
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          input: input.trim(),
          numQuestions,
          questionType,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate questions")
      }

      const data = await response.json()
      onGenerate(data.questions)
      toast.success(`Generated ${data.questions.length} questions!`)
    } catch (error) {
      toast.error("Failed to generate questions. Please try again.")
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Quiz Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                mode === "topic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setMode("topic")}
            >
              From Topic
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                mode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setMode("text")}
            >
              From Text
            </button>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <Label>{mode === "topic" ? "Topic" : "Paste your text"}</Label>
            {mode === "topic" ? (
              <Input
                placeholder="e.g., Photosynthesis, World War II, JavaScript basics"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="bg-input border-border"
              />
            ) : (
              <Textarea
                placeholder="Paste the text you want to generate questions from..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="bg-input border-border resize-none"
                rows={6}
              />
            )}
          </div>

          {/* Number of questions */}
          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={numQuestions}
              onChange={(e) => {
                const val = e.target.value
                if (val === "") {
                  // Allow clearing the input (will be handled as invalid/default on generate)
                  setNumQuestions(val as unknown as number)
                } else {
                  setNumQuestions(Number.parseInt(val) || 0)
                }
              }}
              className="bg-input border-border"
            />
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select
              value={questionType}
              onValueChange={(val: any) => setQuestionType(val)}
            >
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MIXED">Mixed / Randomized</SelectItem>
                <SelectItem value="MULTIPLE_CHOICE">Multiple Choice Only</SelectItem>
                <SelectItem value="TRUE_FALSE">True / False Only</SelectItem>
                <SelectItem value="MULTIPLE_SELECT">Multiple Select Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? loadingText : "Generate Questions"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
