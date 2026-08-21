import axiosClient from './axiosClient';

export function listPhase2Questions() {
  return axiosClient.get('/phase2-questions').then((res) => res.data);
}

export function createPhase2Question(data) {
  return axiosClient.post('/phase2-questions', data).then((res) => res.data);
}

export function updatePhase2Question(id, data) {
  return axiosClient.put(`/phase2-questions/${id}`, data).then((res) => res.data);
}

export function deletePhase2Question(id) {
  return axiosClient.delete(`/phase2-questions/${id}`).then((res) => res.data);
}

export function reorderPhase2Questions(orderedIds) {
  return axiosClient.put('/phase2-questions/reorder', { orderedIds }).then((res) => res.data);
}
