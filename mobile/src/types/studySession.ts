export type StudySessionMode = 'FLASHCARDS' | 'LEARN' | 'TEST' | 'MATCH' | 'WEAK_REVIEW';

export interface StudySession {
  session_id: number;
  user_id: number;
  set_id: number | null;
  mode: StudySessionMode;
  started_at: string;
  ended_at: string | null;
  score: number | null;
  cards_studied: number;
  duration_seconds?: number;
}

export interface StudyStats {
  current_streak: number;
  longest_streak: number;
  total_study_days: number;
  total_sessions: number;
  total_duration_seconds: number;
  today_studied: boolean;
  today_duration_seconds: number;
}

export interface StartSessionParams {
  set_id?: number | null;
  mode: StudySessionMode;
  started_at?: string;
}

export interface CompleteSessionParams {
  score?: number | null;
  cards_studied?: number;
  ended_at?: string;
}
