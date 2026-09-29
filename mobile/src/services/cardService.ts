import api, { ApiResponse } from './api';
import { Card } from '../types/card';

export interface CreateCardDto {
  term: string;
  definition: string;
  pronunciation?: string | null;
  example?: string | null;
  image_url?: string | null;
  position?: number;
}

export interface UpdateCardDto {
  term?: string;
  definition?: string;
  pronunciation?: string | null;
  example?: string | null;
  image_url?: string | null;
  position?: number;
}

export const cardService = {
  getCards: async (setId: number | string): Promise<ApiResponse<Card[]>> => {
    return api.get<Card[]>(`/study-sets/${setId}/cards`);
  },

  createCard: async (
    setId: number | string,
    data: CreateCardDto,
  ): Promise<ApiResponse<Card>> => {
    return api.post<Card>(`/study-sets/${setId}/cards`, data);
  },

  updateCard: async (
    cardId: number | string,
    data: UpdateCardDto,
  ): Promise<ApiResponse<Card>> => {
    return api.patch<Card>(`/cards/${cardId}`, data);
  },

  deleteCard: async (cardId: number | string): Promise<ApiResponse<null>> => {
    return api.delete<null>(`/cards/${cardId}`);
  },
};

export default cardService;
