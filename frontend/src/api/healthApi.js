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

export function declareRestriction(dut1Id, { startDate, endDate, reason, activityId, criterionId }) {
  return axiosClient
    .post(`/health/dut1/${dut1Id}/restrictions`, { startDate, endDate, reason, activityId, criterionId })
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

export function getTreatments(status, dut1Id) {
  return axiosClient
    .get('/health/treatments', { params: { ...(status ? { status } : {}), ...(dut1Id ? { dut1Id } : {}) } })
    .then((res) => res.data);
}

export function createTreatment(payload) {
  return axiosClient.post('/health/treatments', payload).then((res) => res.data);
}

export function updateTreatment(id, payload) {
  return axiosClient.put(`/health/treatments/${id}`, payload).then((res) => res.data);
}

export function endTreatment(id) {
  return axiosClient.put(`/health/treatments/${id}/end`).then((res) => res.data);
}

export function deleteTreatment(id) {
  return axiosClient.delete(`/health/treatments/${id}`).then((res) => res.data);
}

export function getTreatmentSchedule(date) {
  return axiosClient.get('/health/treatments/schedule', { params: { date } }).then((res) => res.data);
}

export function markTreatmentIntake(treatmentId, { date, slot, taken }) {
  return axiosClient
    .put(`/health/treatments/${treatmentId}/intake`, { date, slot, taken })
    .then((res) => res.data);
}
