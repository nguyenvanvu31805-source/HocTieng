export interface TestDetailInput {
  card_id: number;
  question_order?: number;
  user_answer?: string | null;
}

export interface CreateTestResultPayload {
  set_id: number;
  total_questions?: number;
  correct_answers?: number;
  score?: number;
  details?: TestDetailInput[];
}

export interface TestResultDetail {
  detail_id: number;
  result_id: number;
  card_id: number;
  question_order: number;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  term: string;
  definition: string;
  pronunciation?: string | null;
  example?: string | null;
  audio_url?: string | null;
  created_at?: string;
}

export interface TestResult {
  result_id: number;
  user_id: number;
  set_id: number;
  total_questions: number;
  correct_answers: number;
  score: number | string;
  created_at: string;
  study_set?: {
    set_id: number;
    title: string | null;
  };
  details?: TestResultDetail[];
  incorrect_card_ids?: number[];
}

export interface QuestionOption {
  label: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface QuizQuestion {
  card_id: number;
  term: string;
  pronunciation?: string | null;
  example?: string | null;
  audio_url?: string | null;
  correctDefinition: string;
  options: QuestionOption[];
}

export interface QuestionResultDetail {
  questionNumber: number;
  card_id?: number;
  term: string;
  pronunciation?: string | null;
  example?: string | null;
  audio_url?: string | null;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface QuizSummary {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  savedResult?: TestResult | null;
  details: QuestionResultDetail[];
}
