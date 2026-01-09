import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    if (typeof window === "undefined") {
      // During build/SSR without keys, we can return a dummy or throw a more helpful error if strictly needed
      // But for static generation, it's often better to just warn or return null if possible
      console.warn("Missing Supabase environment variables")
      return null as any
    }
    // On client, this will likely fail anyway, but let's try to be safe
    throw new Error("Missing Supabase URL or Anon Key")
  }

  return createBrowserClient(url, key)
}
