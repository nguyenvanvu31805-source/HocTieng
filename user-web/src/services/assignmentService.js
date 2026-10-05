import api from "./api";

export const getMySubmission = async (assignmentId) => {
  const { data } = await api.get(`/assignments/${assignmentId}/my-submission`);
  return data?.data || null;
};

export const startAssignment = async (assignmentId) => {
  const { data } = await api.post(`/assignments/${assignmentId}/start`);
  return data?.data || null;
};

export const submitAssignment = async (assignmentId, payload) => {
  const { data } = await api.post(`/assignments/${assignmentId}/submit`, payload);
  return data?.data || null;
};

export const getAssignmentDetail = async (assignmentId) => {
  const { data } = await api.get(`/assignments/${assignmentId}`);
  return data?.data || null;
};

export const getGradebook = async (classId, assignmentId) => {
  const { data } = await api.get(
    `/classes/${classId}/assignments/${assignmentId}/gradebook`
  );
  return data?.data || null;
};

export default {
  getMySubmission,
  startAssignment,
  submitAssignment,
  getAssignmentDetail,
  getGradebook,
};
