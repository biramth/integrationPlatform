import axiosClient from './axiosClient';

export function listAllergens() {
  return axiosClient.get('/allergens').then((res) => res.data);
}

export function createAllergen(label) {
  return axiosClient.post('/allergens', { label }).then((res) => res.data);
}

export function updateAllergen(id, label) {
  return axiosClient.put(`/allergens/${id}`, { label }).then((res) => res.data);
}

export function deleteAllergen(id) {
  return axiosClient.delete(`/allergens/${id}`).then((res) => res.data);
}
