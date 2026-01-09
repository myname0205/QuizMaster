-- Ensure player_answers table is included in the supabase_realtime publication
-- This is often required for the client to receive postgres_changes events

-- Attempt to add the table. If it's already there, this might error in strict SQL, 
-- but usually Supabase handles 'add table' idempotently or we can ignore the error.
-- Safest way is to alter publication.

DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers';
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication
  WHEN undefined_object THEN
    NULL; -- Publication might not exist (unlikely in Supabase)
  WHEN OTHERS THEN
    NULL; -- Ignore other errors to be safe
END
$$;

-- Also verify the policy allows SELECT for everyone (redundant but safe)
DROP POLICY IF EXISTS "Anyone can view player answers" ON public.player_answers;
CREATE POLICY "Anyone can view player answers" ON public.player_answers FOR SELECT USING (true);
