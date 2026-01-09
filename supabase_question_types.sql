-- Add question_type column to questions table
-- Types: 'MULTIPLE_CHOICE' (default), 'TRUE_FALSE', 'MULTIPLE_SELECT'

ALTER TABLE questions 
ADD COLUMN question_type text NOT NULL DEFAULT 'MULTIPLE_CHOICE';

-- Optional: Add check constraint to ensure valid types
ALTER TABLE questions
ADD CONSTRAINT valid_question_type 
CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT'));
