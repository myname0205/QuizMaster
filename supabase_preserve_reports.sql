-- 1. verification: make quiz_id nullable
ALTER TABLE game_sessions
ALTER COLUMN quiz_id DROP NOT NULL;

-- 2. Drop existing constraint
ALTER TABLE game_sessions
DROP CONSTRAINT IF EXISTS game_sessions_quiz_id_fkey;

-- 3. Add new constraint with ON DELETE SET NULL
ALTER TABLE game_sessions
ADD CONSTRAINT game_sessions_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES quizzes(id)
ON DELETE SET NULL;
