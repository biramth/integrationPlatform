import axiosClient from './axiosClient';

export function searchAdmittedStudents(params = {}) {
  return axiosClient.get('/admitted-students', { params }).then((res) => res.data);
}

export function matchAdmittedStudent(params) {
  return axiosClient.get('/admitted-students/match', { params }).then((res) => res.data);
}

export function admittedStudentsProgress() {
  return axiosClient.get('/admitted-students/progress').then((res) => res.data);
}
