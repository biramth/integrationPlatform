import axiosClient from './axiosClient';

function fileFormData(file) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export function previewAdmittedStudentsFile(file) {
  return axiosClient
    .post('/import/admitted-students/preview', fileFormData(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function confirmAdmittedStudentsImport(candidates) {
  return axiosClient.post('/import/admitted-students/confirm', { candidates }).then((res) => res.data);
}

export function previewRoomsFile(file) {
  return axiosClient
    .post('/import/rooms/preview', fileFormData(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function confirmRoomsImport(candidates) {
  return axiosClient.post('/import/rooms/confirm', { candidates }).then((res) => res.data);
}
