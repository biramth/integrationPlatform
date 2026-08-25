import axiosClient from './axiosClient';

export function login(username, password) {
  return axiosClient.post('/auth/login', { username, password }).then((res) => res.data);
}

export function me() {
  return axiosClient.get('/auth/me').then((res) => res.data);
}

export function changePassword(currentPassword, newPassword) {
  return axiosClient.put('/auth/password', { currentPassword, newPassword }).then((res) => res.data);
}
