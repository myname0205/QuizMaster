"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { toast } from "sonner"
import { useState } from "react"

export function GoogleAuthButton({ text = "Continue with Google" }: { text?: string }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleGoogleLogin = async () => {
        const supabase = createClient()
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (error) {
            toast.error("Failed to initiate Google login")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleLogin} className="w-full">
            {isLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Icons.google className="mr-2 h-4 w-4" />
            )}
            {text}
        </Button>
    )
}
