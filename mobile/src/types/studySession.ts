export type StudySessionMode = 'FLASHCARDS' | 'LEARN' | 'TEST' | 'MATCH' | 'WEAK_REVIEW';

export type StudySessionStatus = 'COMPLETED' | 'IN_PROGRESS';

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

export interface StudySessionItem extends StudySession {
  status: StudySessionStatus;
  set_title?: string | null;
  set_category?: string | null;
  set_description?: string | null;
  set_card_count?: number | null;
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

export interface GetSessionsParams {
  mode?: StudySessionMode | 'ALL';
  page?: number;
  limit?: number;
}
