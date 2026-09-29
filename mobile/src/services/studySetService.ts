import api, { ApiResponse } from './api';
import { StudySet } from '../types/studySet';

export interface CreateStudySetDto {
  title: string;
  description?: string | null;
  category?: string | null;
  language?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export interface UpdateStudySetDto {
  title?: string;
  description?: string | null;
  category?: string | null;
  language?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export const studySetService = {
  getStudySets: async (search?: string): Promise<ApiResponse<StudySet[]>> => {
    const endpoint = search?.trim()
      ? `/study-sets?search=${encodeURIComponent(search.trim())}`
      : '/study-sets';
    return api.get<StudySet[]>(endpoint);
  },

  getMyStudySets: async (): Promise<ApiResponse<StudySet[]>> => {
    return api.get<StudySet[]>('/study-sets/my');
  },

  getStudySet: async (id: number | string): Promise<ApiResponse<StudySet>> => {
    return api.get<StudySet>(`/study-sets/${id}`);
  },

  createStudySet: async (data: CreateStudySetDto): Promise<ApiResponse<StudySet>> => {
    return api.post<StudySet>('/study-sets', data);
  },

  updateStudySet: async (
    id: number | string,
    data: UpdateStudySetDto,
  ): Promise<ApiResponse<StudySet>> => {
    return api.patch<StudySet>(`/study-sets/${id}`, data);
  },

  deleteStudySet: async (id: number | string): Promise<ApiResponse<null>> => {
    return api.delete<null>(`/study-sets/${id}`);
  },
};

export default studySetService;
