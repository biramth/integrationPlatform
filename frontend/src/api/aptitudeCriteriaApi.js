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

export function createLevel(criterionId, label) {
  return axiosClient.post(`/aptitude-criteria/${criterionId}/levels`, { label }).then((res) => res.data);
}

export function updateLevel(criterionId, levelId, label) {
  return axiosClient.put(`/aptitude-criteria/${criterionId}/levels/${levelId}`, { label }).then((res) => res.data);
}

export function deleteLevel(criterionId, levelId) {
  return axiosClient.delete(`/aptitude-criteria/${criterionId}/levels/${levelId}`).then((res) => res.data);
}

export function reorderLevels(criterionId, orderedLevelIds) {
  return axiosClient
    .put(`/aptitude-criteria/${criterionId}/levels/reorder`, { orderedLevelIds })
    .then((res) => res.data);
}

export function listActivitiesWithCriteria() {
  return axiosClient.get('/aptitude-criteria/activities').then((res) => res.data);
}

export function setActivityCriteria(activityId, requirements) {
  return axiosClient.put(`/aptitude-criteria/activities/${activityId}`, { requirements }).then((res) => res.data);
}
