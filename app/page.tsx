import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Sparkles, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/5 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + wordmark — bigger in navbar */}
          <div className="flex items-center gap-3">
            <Image src="/quidle-logo.svg" alt="Quidle" width={44} height={44} />
            <span
              className="font-[family-name:var(--font-brand)] text-2xl font-bold tracking-tight"
              style={{ background: "linear-gradient(135deg,#E040FB,#00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Quidle
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="hover:bg-white/5 hover:text-primary font-medium">
                Log In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button
                className="font-semibold px-5"
                style={{ background: "linear-gradient(135deg,#E040FB,#00E5FF)", boxShadow: "0 0 24px -4px #E040FB88" }}
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="container mx-auto px-6 flex-1 relative z-10">

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Quidle",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web",
              "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
              "description": "Generate AI-powered quizzes and host real-time competitive games.",
              "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "156" }
            })
          }}
        />

        {/* Hero content */}
        <div className="max-w-4xl mx-auto text-center pt-24 pb-16">

          {/* Large hero logo — the visual anchor */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Ambient glow behind logo */}
              <div className="absolute inset-0 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, #E040FB 0%, #00E5FF 100%)", transform: "scale(1.6)" }} />
              <Image
                src="/quidle-logo.svg"
                alt="Quidle"
                width={120}
                height={120}
                className="relative drop-shadow-2xl"
                priority
              />
            </div>
          </div>

          {/* AI badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 border text-sm font-bold uppercase tracking-widest"
            style={{
              background: "rgba(224,64,251,0.08)",
              borderColor: "rgba(224,64,251,0.25)",
              color: "#E040FB",
              boxShadow: "0 0 20px -6px #E040FB66"
            }}>
            <Sparkles className="w-4 h-4 animate-pulse" />
            AI-Powered Quiz Generation
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.05]">
            <span className="text-foreground">Create Quizzes</span>
            <br />
            <span
              style={{ background: "linear-gradient(135deg,#E040FB 30%,#00E5FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              in Seconds
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate AI-powered quizzes and host real-time competitive games.
            Perfect for classrooms, team training, and trivia nights.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto font-bold transition-all hover:-translate-y-1"
                style={{
                  background: "linear-gradient(135deg,#E040FB,#00E5FF)",
                  boxShadow: "0 0 30px -6px #E040FB, 0 4px 20px rgba(0,0,0,0.3)"
                }}
              >
                <Zap className="w-5 h-5 mr-2" />
                Create Your First Quiz
              </Button>
            </Link>
            <Link href="/join">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-6 h-auto font-semibold backdrop-blur-sm transition-all hover:-translate-y-1"
                style={{
                  borderColor: "rgba(224,64,251,0.35)",
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "0 0 20px -8px #E040FB44"
                }}
              >
                Join a Game
              </Button>
            </Link>
          </div>

          {/* Feature cards — match the neon identity */}
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "AI Generation",
                desc: "Type a topic or paste text — AI crafts perfect quiz questions instantly.",
                gradient: "from-[#E040FB]/20 to-[#E040FB]/5",
                iconColor: "#E040FB",
                glow: "#E040FB44",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Real-Time Games",
                desc: "Host live multiplayer games with instant feedback and competitive scoring.",
                gradient: "from-[#7C4DFF]/20 to-[#00E5FF]/5",
                iconColor: "#7C4DFF",
                glow: "#7C4DFF44",
              },
              {
                icon: <Trophy className="w-6 h-6" />,
                title: "Track Progress",
                desc: "View detailed analytics and download PDF reports for every game session.",
                gradient: "from-[#00E5FF]/20 to-[#00E5FF]/5",
                iconColor: "#00E5FF",
                glow: "#00E5FF44",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`p-7 rounded-2xl backdrop-blur-sm border border-white/8 bg-gradient-to-br ${card.gradient} transition-all duration-300 hover:-translate-y-1 hover:border-white/15`}
                style={{ boxShadow: `0 4px 30px -8px ${card.glow}, inset 0 1px 0 rgba(255,255,255,0.06)` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mx-auto"
                  style={{ background: `${card.iconColor}20`, color: card.iconColor, boxShadow: `0 0 20px -4px ${card.glow}` }}
                >
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
