import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, Users, Trophy, Sparkles } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b border-border/10 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">QuizMaster</span>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary">Log In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="shadow-[0_0_20px_-5px_var(--color-primary)]">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 backdrop-blur-md text-primary mb-8 border border-primary/20 shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] transition-all duration-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">AI-Powered Quiz Generation</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-foreground mb-6 text-balance tracking-tight">
            Create Engaging Quizzes in <span className="text-primary relative">
              Seconds
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
            Generate AI-powered quizzes and host real-time competitive games. Perfect for classrooms, team training, and
            trivia nights.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                Create Your First Quiz
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto bg-background/50 backdrop-blur-sm hover:bg-background/80">
                Join a Game
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Generation</h3>
              <p className="text-muted-foreground">
                Type a topic or paste text and let AI create perfect quiz questions instantly.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Games</h3>
              <p className="text-muted-foreground">
                Host live games with instant feedback, leaderboards, and competitive scoring.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Trophy className="w-6 h-6 text-primary" />
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
