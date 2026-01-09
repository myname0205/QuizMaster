-- 1. Add deleted_at column to quizzes
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. (Optional but recommended) Index for performance
CREATE INDEX IF NOT EXISTS quizzes_deleted_at_idx ON quizzes(deleted_at);
