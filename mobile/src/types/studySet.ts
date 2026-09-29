export interface StudySet {
  set_id: number;
  creator_id: number;
  title: string;
  description: string | null;
  category: string | null;
  language: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'ACTIVE' | 'HIDDEN';
  created_at: string;
  updated_at: string;
  creator_username?: string;
  creator_full_name?: string | null;
  card_count: number;
}
