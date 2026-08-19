import axiosClient from './axiosClient';

export function listActivities() {
  return axiosClient.get('/activities').then((res) => res.data);
}

export function createActivity(payload) {
  return axiosClient.post('/activities', payload).then((res) => res.data);
}

export function updateActivity(id, payload) {
  return axiosClient.put(`/activities/${id}`, payload).then((res) => res.data);
}

export function deleteActivity(id) {
  return axiosClient.delete(`/activities/${id}`).then((res) => res.data);
}
