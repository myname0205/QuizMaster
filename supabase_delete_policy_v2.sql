-- Drop the incorrect policy if you created it
DROP POLICY IF EXISTS "Hosts can delete answers in their sessions" ON player_answers;

-- Correct Policy: Join through 'players' table
CREATE POLICY "Hosts can delete answers in their sessions"
ON player_answers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM players
    JOIN game_sessions ON players.game_session_id = game_sessions.id
    WHERE players.id = player_answers.player_id
    AND game_sessions.host_id = auth.uid()
  )
);

-- Ensure Player delete policy is also correct
DROP POLICY IF EXISTS "Hosts can delete players in their sessions" ON players;

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

-- Ensure Session delete policy is correct
DROP POLICY IF EXISTS "Hosts can delete their own game sessions" ON game_sessions;

CREATE POLICY "Hosts can delete their own game sessions"
ON game_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = host_id);
