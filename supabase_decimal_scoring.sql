-- Migration to allow decimal scores
BEGIN;

    -- Alter player_answers table
    ALTER TABLE player_answers 
    ALTER COLUMN points_earned TYPE DECIMAL(10, 2);

    -- Alter players table
    ALTER TABLE players 
    ALTER COLUMN total_score TYPE DECIMAL(10, 2);

COMMIT;
