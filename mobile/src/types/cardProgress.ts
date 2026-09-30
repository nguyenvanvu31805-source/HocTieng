export interface CardProgressRecord {
  progress_id: number;
  user_id: number;
  card_id: number;
  mastery_level: number; // 0: not_started, 1: learning, 2: basic, 3: mastered
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string;
  next_review_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface MasterySummary {
  not_started: number;
  learning: number;
  basic: number;
  mastered: number;
}

export type StudyFilterType = 'all' | 'unlearned' | 'review' | 'weak' | 'mastered';

export interface FilterCounts {
  all: number;
  unlearned: number;
  weak: number;
  review: number;
  mastered: number;
  learning?: number;
}

export interface StudySetProgress {
  set_id: number;
  total_cards: number;
  studied_cards: number;
  progress_percent: number;
  mastery: MasterySummary;
  counts?: FilterCounts;
  records: CardProgressRecord[];
}
