import axiosClient from './axiosClient';

export function listCriteria() {
  return axiosClient.get('/aptitude-criteria').then((res) => res.data);
}

export function createCriterion(label) {
  return axiosClient.post('/aptitude-criteria', { label }).then((res) => res.data);
}

export function updateCriterion(id, label) {
  return axiosClient.put(`/aptitude-criteria/${id}`, { label }).then((res) => res.data);
}

export function deleteCriterion(id) {
  return axiosClient.delete(`/aptitude-criteria/${id}`).then((res) => res.data);
}

export function listActivitiesWithCriteria() {
  return axiosClient.get('/aptitude-criteria/activities').then((res) => res.data);
}

export function setActivityCriteria(activityId, criterionIds) {
  return axiosClient.put(`/aptitude-criteria/activities/${activityId}`, { criterionIds }).then((res) => res.data);
}
