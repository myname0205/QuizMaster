-- Additional policies for anonymous game access
-- Questions viewable during active games
CREATE POLICY "Players can view questions during game" ON public.questions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs 
    JOIN public.quizzes q ON gs.quiz_id = q.id 
    WHERE q.id = questions.quiz_id AND (gs.status = 'playing' OR gs.status = 'finished')
  ));

-- Answer options viewable during active games (but not showing is_correct until finished)
CREATE POLICY "Players can view answer options during game" ON public.answer_options FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes qz ON q.quiz_id = qz.id
    JOIN public.game_sessions gs ON gs.quiz_id = qz.id
    WHERE q.id = answer_options.question_id AND (gs.status = 'playing' OR gs.status = 'finished')
  ));
