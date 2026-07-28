import axiosClient from './axiosClient';

export function getRisks(date) {
  return axiosClient.get('/health/risks', { params: { date } }).then((res) => res.data);
}

export function getIllnessByDate(date) {
  return axiosClient.get('/health/illness', { params: { date } }).then((res) => res.data);
}

export function declareIllness(dut1Id, illnessDate, note) {
  return axiosClient
    .post(`/health/dut1/${dut1Id}/illness`, { illnessDate, note })
    .then((res) => res.data);
}

export function getIllnessForDut1(dut1Id) {
  return axiosClient.get(`/health/dut1/${dut1Id}/illness`).then((res) => res.data);
}
