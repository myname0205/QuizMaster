-- 1. Drop existing Link if necessary (we need to know the constraint name, usually standard)
--    We try to drop the constraint on game_sessions referencing quizzes

-- NOTE: You might need to check the specific constraint name in your database if 'game_sessions_quiz_id_fkey' is not it.
-- But usually Supabase defaults to table_column_fkey.

ALTER TABLE game_sessions
DROP CONSTRAINT IF EXISTS game_sessions_quiz_id_fkey;

-- 2. Re-add the Foreign Key with ON DELETE CASCADE
ALTER TABLE game_sessions
ADD CONSTRAINT game_sessions_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES quizzes(id)
ON DELETE CASCADE;

-- Now when you delete a Quiz, all associated Game Sessions (and their players/answers) will be deleted automatically.
