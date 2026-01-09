-- Enable Row Level Security on all tables

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Quizzes policies
CREATE POLICY "Users can view own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Questions policies (tied to quiz ownership)
CREATE POLICY "Users can view questions of own quizzes" ON public.questions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can create questions for own quizzes" ON public.questions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can update questions of own quizzes" ON public.questions FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));
CREATE POLICY "Users can delete questions of own quizzes" ON public.questions FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.user_id = auth.uid()));

-- Answer options policies (tied to quiz ownership via questions)
CREATE POLICY "Users can view answer options of own quizzes" ON public.answer_options FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.questions q 
    JOIN public.quizzes qz ON q.quiz_id = qz.id 
    WHERE q.id = answer_options.question_id AND qz.user_id = auth.uid()
  ));
CREATE POLICY "Users can create answer options for own quizzes" ON public.answer_options FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions q 
    JOIN public.quizzes qz ON q.quiz_id = qz.id 
    WHERE q.id = answer_options.question_id AND qz.user_id = auth.uid()
  ));
CREATE POLICY "Users can update answer options of own quizzes" ON public.answer_options FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.questions q 
    JOIN public.quizzes qz ON q.quiz_id = qz.id 
    WHERE q.id = answer_options.question_id AND qz.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete answer options of own quizzes" ON public.answer_options FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.questions q 
    JOIN public.quizzes qz ON q.quiz_id = qz.id 
    WHERE q.id = answer_options.question_id AND qz.user_id = auth.uid()
  ));

-- Game sessions policies
CREATE POLICY "Hosts can view own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = host_id);
CREATE POLICY "Hosts can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own game sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete own game sessions" ON public.game_sessions FOR DELETE USING (auth.uid() = host_id);
-- Allow anyone to view active game sessions by game code (for joining)
CREATE POLICY "Anyone can view game session by code" ON public.game_sessions FOR SELECT USING (status = 'waiting' OR status = 'playing');

-- Players policies (anyone can join a game)
CREATE POLICY "Anyone can view players in a game" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can join as player" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own player" ON public.players FOR UPDATE USING (true);

-- Player answers policies
CREATE POLICY "Anyone can view player answers" ON public.player_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can submit answers" ON public.player_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update player answers" ON public.player_answers FOR UPDATE USING (true);
