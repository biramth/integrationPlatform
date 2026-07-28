import axiosClient from './axiosClient';

export function listAgents() {
  return axiosClient.get('/agents').then((res) => res.data);
}

export function createAgent(payload) {
  return axiosClient.post('/agents', payload).then((res) => res.data);
}

export function updateAgent(id, payload) {
  return axiosClient.put(`/agents/${id}`, payload).then((res) => res.data);
}

export function resetAgentPassword(id, password) {
  return axiosClient.put(`/agents/${id}/password`, { password }).then((res) => res.data);
}

export function deactivateAgent(id) {
  return axiosClient.delete(`/agents/${id}`).then((res) => res.data);
}
