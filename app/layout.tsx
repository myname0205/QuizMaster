import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { InteractiveBackground } from "@/components/ui/interactive-background"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "QuizMaster - Create Engaging Quizzes",
  description:
    "Generate AI-powered quizzes and host real-time competitive games for classrooms, training, and trivia nights.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" }
    ],
  },
  manifest: "/site.webmanifest",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen relative overflow-x-hidden selection:bg-primary selection:text-white`}>
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
