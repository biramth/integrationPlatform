import axiosClient from './axiosClient';

export function getOverview() {
  return axiosClient.get('/stats/overview').then((res) => res.data);
}

export function getByDepartment() {
  return axiosClient.get('/stats/by-department').then((res) => res.data);
}

export function getByGender() {
  return axiosClient.get('/stats/by-gender').then((res) => res.data);
}

export function getRoomsOccupancy() {
  return axiosClient.get('/stats/rooms-occupancy').then((res) => res.data);
}

export function getIllnessTrend(days = 14) {
  return axiosClient.get('/stats/illness-trend', { params: { days } }).then((res) => res.data);
}

export function getAllergyPrevalence() {
  return axiosClient.get('/stats/allergy-prevalence').then((res) => res.data);
}
