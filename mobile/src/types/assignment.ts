export type AssignmentMode = 'FLASHCARDS' | 'LEARN' | 'TEST' | 'MATCH';

export interface Assignment {
  assignment_id: number;
  class_id: number;
  set_id: number;
  title: string;
  description: string | null;
  mode: AssignmentMode;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  study_set_title: string;
  card_count: number;
}

export interface AssignmentDetail extends Assignment {
  class_name: string;
  teacher_id: number;
  study_set_description: string | null;
}

export interface CreateAssignmentPayload {
  set_id: number;
  title: string;
  description?: string;
  mode: AssignmentMode;
  deadline?: string | null;
}
