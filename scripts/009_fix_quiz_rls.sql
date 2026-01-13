-- Allow anonymous players to view quiz details if:
-- 1. They are accessing a game session that exists (implicit in the logical flow, usually checked via game_sessions policies)
-- 2. The quiz belongs to a game session that is 'waiting' or 'playing'
-- This is necessary because players need to fetch quiz.questions and quiz.title

CREATE POLICY "Players can view quizzes during game" ON public.quizzes FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs 
    WHERE gs.quiz_id = quizzes.id 
    AND (gs.status = 'waiting' OR gs.status = 'playing' OR gs.status = 'finished')
  ));
