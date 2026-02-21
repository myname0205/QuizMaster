import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <Image src="/logo.svg" alt="Quidle logo" width={44} height={44} />
            <span className="font-[family-name:var(--font-brand)] text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quidle</span>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-foreground">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {params?.error ? (
                <p className="text-sm text-muted-foreground mb-6">Error: {params.error}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">
                  An unspecified error occurred during authentication.
                </p>
              )}
              <Link href="/auth/login">
                <Button className="w-full">Try Again</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
