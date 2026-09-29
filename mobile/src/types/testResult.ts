export interface CreateTestResultPayload {
  set_id: number;
  total_questions: number;
  correct_answers: number;
  score: number;
}

export interface TestResult {
  result_id: number;
  user_id: number;
  set_id: number;
  total_questions: number;
  correct_answers: number;
  score: string | number;
  created_at: string;
}

export interface QuestionOption {
  label: string; // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface QuizQuestion {
  card_id: number;
  term: string;
  pronunciation?: string | null;
  correctDefinition: string;
  options: QuestionOption[];
}

export interface QuestionResultDetail {
  questionNumber: number;
  term: string;
  pronunciation?: string | null;
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
