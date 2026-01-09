-- Function to increment player score atomically
CREATE OR REPLACE FUNCTION increment_player_score(p_player_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.players
  SET total_score = total_score + p_points
  WHERE id = p_player_id;
END;
$$;
