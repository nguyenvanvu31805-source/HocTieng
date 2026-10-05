export type AssignmentMode = 'FLASHCARDS' | 'LEARN' | 'TEST' | 'MATCH' | 'ALL';

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

export type AssignmentSubmissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE';

export interface AssignmentSubmission {
  assignment_id: number;
  submission_id: number | null;
  status: AssignmentSubmissionStatus;
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  result_id: number | null;
  test_result_id?: number | null;
  session_id: number | null;
  deadline: string | null;
  mode: AssignmentMode;
  study_set_title: string;
}

export interface SubmitAssignmentPayload {
  result_id?: number | null;
  session_id?: number | null;
}

export interface GradebookSummary {
  total_students: number;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  overdue_count: number;
  completion_rate: number;
  average_score: number | null;
}

export interface GradebookStudent {
  user_id: number;
  username: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  assignment_id: number;
  submission_id: number | null;
  status: AssignmentSubmissionStatus;
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  result_id: number | null;
  session_id: number | null;
}

export interface GradebookAssignmentInfo {
  assignment_id: number;
  class_id: number;
  title: string;
  mode: AssignmentMode;
  deadline: string | null;
  set_id: number;
  study_set_title: string;
}

export interface GradebookData {
  assignment: GradebookAssignmentInfo;
  summary: GradebookSummary;
  students: GradebookStudent[];
}
