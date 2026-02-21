import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono, Outfit } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { InteractiveBackground } from "@/components/ui/interactive-background"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-brand", weight: ["400", "600", "700", "800"] })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quiz-master-two.vercel.app"

export const metadata: Metadata = {
  title: {
    default: "Quidle - AI-Powered Quiz Generator & Game Host",
    template: "%s | Quidle"
  },
  description: "Generate engaging AI quizzes in seconds. Host real-time multiplayer trivia games for classrooms, team building, and events. No account needed to play.",
  metadataBase: new URL(appUrl),
  keywords: ["AI quiz generator", "trivia game host", "classroom quizzes", "team building games", "learning platform", "educational technology", "real-time quiz"],
  authors: [{ name: "Quidle Team" }],
  creator: "Quidle",
  publisher: "Quidle",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Quidle - Create Engaging AI Quizzes in Seconds",
    description: "Transform any topic into an interactive quiz instantly. Host live games, track progress, and engage your audience with Quidle.",
    url: appUrl,
    siteName: "Quidle",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Quidle - Create and Host AI Quizzes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quidle - AI-Powered Quiz Platform",
    description: "Generate quizzes instantly with AI. Host live games for friends, students, or colleagues.",
    images: ["/og-image.png"],
    creator: "@quidle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen relative overflow-x-hidden selection:bg-primary selection:text-white`}>
        {/* Global Background Effects */}
        <div className="fixed inset-0 bg-background -z-50" />
        <div className="fixed inset-0 bg-grid-pattern opacity-10 -z-40" />
        <div className="fixed inset-0 bg-noise opacity-[0.03] pointer-events-none z-50 mix-blend-overlay" />

        {/* Dynamic Interactive Background */}
        <InteractiveBackground />

        <div className="relative z-0">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Changed defaultTheme to "dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <div className="fixed bottom-4 right-4 z-50">
              <ModeToggle />
            </div>
          </ThemeProvider>
        </div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
