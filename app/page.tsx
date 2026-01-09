import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, Users, Trophy, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">QuizMaster</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Quiz Generation</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 text-balance">
            Create Engaging Quizzes in <span className="text-primary">Seconds</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
            Generate AI-powered quizzes and host real-time competitive games. Perfect for classrooms, team training, and
            trivia nights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Create Your First Quiz
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent">
                Join a Game
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Generation</h3>
              <p className="text-muted-foreground">
                Type a topic or paste text and let AI create perfect quiz questions instantly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Games</h3>
              <p className="text-muted-foreground">
                Host live games with instant feedback, leaderboards, and competitive scoring.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Track Progress</h3>
              <p className="text-muted-foreground">
                View detailed analytics and download reports for each game session.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
