import axiosClient from './axiosClient';

export function listRooms() {
  return axiosClient.get('/rooms').then((res) => res.data);
}

export function createRoom(payload) {
  return axiosClient.post('/rooms', payload).then((res) => res.data);
}

export function updateRoom(id, payload) {
  return axiosClient.put(`/rooms/${id}`, payload).then((res) => res.data);
}

export function deleteRoom(id) {
  return axiosClient.delete(`/rooms/${id}`).then((res) => res.data);
}

export function updateMattressCount(id, mattressCount) {
  return axiosClient.put(`/rooms/${id}/mattress-count`, { mattressCount }).then((res) => res.data);
}
