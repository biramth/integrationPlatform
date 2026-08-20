import axiosClient from './axiosClient';

export function createDut1(payload) {
  return axiosClient.post('/dut1', payload).then((res) => res.data);
}

export function listDut1(params = {}) {
  return axiosClient.get('/dut1', { params }).then((res) => res.data);
}

export function getDut1(id) {
  return axiosClient.get(`/dut1/${id}`).then((res) => res.data);
}

export function updateDut1(id, payload) {
  return axiosClient.put(`/dut1/${id}`, payload).then((res) => res.data);
}

export function deleteDut1(id) {
  return axiosClient.delete(`/dut1/${id}`).then((res) => res.data);
}

export function exportDut1Csv(params = {}) {
  return axiosClient.get('/dut1/export', { params, responseType: 'blob' }).then((res) => res.data);
}

export function exportDut1ContactsCsv(params = {}) {
  return axiosClient.get('/dut1/export-contacts', { params, responseType: 'blob' }).then((res) => res.data);
}

export function listWithoutLuggage() {
  return axiosClient.get('/dut1/without-luggage').then((res) => res.data);
}

export function listWithoutComplementary() {
  return axiosClient.get('/dut1/without-complementary').then((res) => res.data);
}

export function completeComplementary(id, { extraFields, admissionListType, onTreatment, treatmentDetails }) {
  return axiosClient
    .put(`/dut1/${id}/complementary`, { extraFields, admissionListType, onTreatment, treatmentDetails })
    .then((res) => res.data);
}

export function reassignRoom(id, roomId) {
  return axiosClient.put(`/dut1/${id}/room`, { roomId }).then((res) => res.data);
}

export function getDut1RoomHistory(id) {
  return axiosClient.get(`/dut1/${id}/room-history`).then((res) => res.data);
}
