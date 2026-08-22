import axiosClient from './axiosClient';

export function listMedications() {
  return axiosClient.get('/medications').then((res) => res.data);
}

export function createMedication(payload) {
  return axiosClient.post('/medications', payload).then((res) => res.data);
}

export function updateMedication(id, payload) {
  return axiosClient.put(`/medications/${id}`, payload).then((res) => res.data);
}

export function deleteMedication(id) {
  return axiosClient.delete(`/medications/${id}`).then((res) => res.data);
}

export function recordMovement(id, payload) {
  return axiosClient.post(`/medications/${id}/movements`, payload).then((res) => res.data);
}

export function listMovements(id) {
  return axiosClient.get(`/medications/${id}/movements`).then((res) => res.data);
}
