export interface ClassItem {
  class_id: number;
  teacher_id: number;
  name: string;
  description: string | null;
  join_code?: string;
  created_at: string;
  updated_at: string;
  joined_at?: string;
  member_role?: 'TEACHER' | 'STUDENT';
  teacher_username?: string;
  teacher_full_name?: string;
  teacher_avatar_url?: string | null;
  member_count: number;
  assignment_count: number;
}

export interface ClassDetail {
  class_id: number;
  teacher_id: number;
  name: string;
  description: string | null;
  join_code: string;
  created_at: string;
  updated_at: string;
  teacher_username: string;
  teacher_full_name: string;
  teacher_avatar_url: string | null;
  member_count: number;
  assignment_count: number;
  is_teacher: boolean;
  is_member: boolean;
  member_role: 'TEACHER' | 'STUDENT' | null;
}

export interface ClassMember {
  class_id: number;
  user_id: number;
  member_role: 'TEACHER' | 'STUDENT';
  joined_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  email?: string;
}

export interface JoinClassResponse {
  class_id: number;
  message: string;
  already_member: boolean;
}

export interface CreateClassPayload {
  name: string;
  description?: string;
}
