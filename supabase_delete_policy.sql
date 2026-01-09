-- Enable deletion for Game Sessions
CREATE POLICY "Hosts can delete their own game sessions"
ON game_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);

-- Ensure Hosts can delete players (already done likely, but reinforcing)
CREATE POLICY "Hosts can delete players in their sessions"
ON players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE game_sessions.id = players.game_session_id
    AND game_sessions.host_id = auth.uid()
  )
);

-- Enable deletion for Player Answers (needed for cleanup)
CREATE POLICY "Hosts can delete answers in their sessions"
ON player_answers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM game_sessions
    WHERE game_sessions.id = player_answers.game_session_id
    AND game_sessions.host_id = auth.uid()
  )
);
