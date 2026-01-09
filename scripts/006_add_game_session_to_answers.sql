-- Add game_session_id to player_answers table
-- This is necessary for Realtime subscriptions to filter by game session

ALTER TABLE public.player_answers 
ADD COLUMN IF NOT EXISTS game_session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_player_answers_game_session_id ON public.player_answers(game_session_id);

-- Backfill data based on player's game_session_id
UPDATE public.player_answers pa
SET game_session_id = p.game_session_id
FROM public.players p
WHERE pa.player_id = p.id
AND pa.game_session_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.player_answers 
ALTER COLUMN game_session_id SET NOT NULL;
