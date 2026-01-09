export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  questions?: Question[]
}

export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT"

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  image_url: string | null
  question_type: QuestionType
  time_limit: number
  points: number
  order_index: number
  created_at: string
  answer_options?: AnswerOption[]
}

export interface AnswerOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

export interface GameSession {
  id: string
  quiz_id: string
  host_id: string
  game_code: string
  status: "waiting" | "playing" | "finished"
  current_question_index: number
  question_start_time: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  quiz?: Quiz
}

export interface Player {
  id: string
  game_session_id: string
  nickname: string
  avatar: string
  total_score: number
  joined_at: string
}

export interface PlayerAnswer {
  id: string
  player_id: string
  question_id: string
  answer_option_id: string | null
  is_correct: boolean
  response_time_ms: number | null
  points_earned: number
  answered_at: string
}

export const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐸", "🦄", "🐙", "🦋", "🐳", "🦉", "🐨", "🦩", "🦈", "🐢", "🦎", "🐲"]
