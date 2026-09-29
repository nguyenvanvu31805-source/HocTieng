export interface Card {
  card_id: number;
  set_id: number;
  term: string;
  definition: string;
  pronunciation?: string | null;
  example?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  position?: number;
  created_at?: string;
  updated_at?: string;
}
