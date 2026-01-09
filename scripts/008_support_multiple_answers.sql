-- Add question_type to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'MULTIPLE_CHOICE';

-- Add answer_option_ids to player_answers table
ALTER TABLE public.player_answers 
ADD COLUMN IF NOT EXISTS answer_option_ids UUID[];

-- Verify that answer_option_id is nullable (it was created with REFERENCES ... which implies nullable unless NOT NULL is specified)
-- We'll verify by attempting to set it to null for new records implicitly.
-- Adjust constraint if it was strictly NOT NULL (default for REFERENCES is usually nullable in standard SQL unless specified)
ALTER TABLE public.player_answers 
ALTER COLUMN answer_option_id DROP NOT NULL;

-- Backfill question_type (optional, default handles it)

-- Create index for performance on type filtering if needed
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(question_type);
