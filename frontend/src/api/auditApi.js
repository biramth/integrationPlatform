import axiosClient from './axiosClient';

export function listAuditLogs(params) {
  return axiosClient.get('/audit', { params }).then((res) => res.data);
}

export function getAuditLog(id) {
  return axiosClient.get(`/audit/${id}`).then((res) => res.data);
}
