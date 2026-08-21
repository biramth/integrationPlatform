import axiosClient from './axiosClient';

export function getRisks(date) {
  return axiosClient.get('/health/risks', { params: { date } }).then((res) => res.data);
}

export function getActiveRestrictions() {
  return axiosClient.get('/health/restrictions/active').then((res) => res.data);
}

export function getOnTreatment() {
  return axiosClient.get('/health/on-treatment').then((res) => res.data);
}

export function declareRestriction(dut1Id, { startDate, endDate, reason, activityId }) {
  return axiosClient
    .post(`/health/dut1/${dut1Id}/restrictions`, { startDate, endDate, reason, activityId })
    .then((res) => res.data);
}

export function getRestrictionsForDut1(dut1Id) {
  return axiosClient.get(`/health/dut1/${dut1Id}/restrictions`).then((res) => res.data);
}

export function resolveRestriction(id) {
  return axiosClient.put(`/health/restrictions/${id}/resolve`).then((res) => res.data);
}

export function deleteRestriction(id) {
  return axiosClient.delete(`/health/restrictions/${id}`).then((res) => res.data);
}
