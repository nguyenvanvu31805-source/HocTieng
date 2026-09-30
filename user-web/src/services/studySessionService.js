import api from "./api";

export const startSession = async ({ setId = null, mode }) => {
  const { data } = await api.post("/study-sessions", {
    set_id: setId,
    mode,
  });
  return data?.data || null;
};

export const completeSession = async (sessionId, { score = null, cards_studied = 0 } = {}) => {
  const { data } = await api.patch(`/study-sessions/${sessionId}/complete`, {
    score,
    cards_studied,
  });
  return data?.data || null;
};

export const getStudyStats = async () => {
  const { data } = await api.get("/study-sessions/stats");
  return data?.data || null;
};

export default {
  startSession,
  completeSession,
  getStudyStats,
};
