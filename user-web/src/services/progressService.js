import api from "./api";

export const getWeakCards = async ({ filter = "all", page = 1, limit = 20 } = {}) => {
  const params = {};
  if (filter) params.filter = filter;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  const response = await api.get("/progress/weak", { params });
  return response.data;
};

export const reviewCard = async (cardId, correct = true) => {
  const response = await api.post(`/progress/cards/${cardId}/review`, { correct });
  return response.data;
};

export default {
  getWeakCards,
  reviewCard,
};
