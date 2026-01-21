import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
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
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
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

        {/* Animated Blobs */}
        <div className="fixed top-0 -left-20 w-[500px] h-[500px] bg-primary/30 rounded-full mix-blend-screen filter blur-[100px] animate-blob opacity-50 -z-30" />
        <div className="fixed top-1/2 -right-20 w-[600px] h-[600px] bg-secondary/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000 opacity-50 -z-30" />
        <div className="fixed -bottom-40 left-1/3 w-[600px] h-[600px] bg-accent/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000 opacity-40 -z-30" />

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
