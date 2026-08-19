import axiosClient from './axiosClient';

function pdfFormData(file) {
  const formData = new FormData();
  formData.append('pdf', file);
  return formData;
}

export function previewAdmittedStudentsPdf(file) {
  return axiosClient
    .post('/import/admitted-students/preview', pdfFormData(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function confirmAdmittedStudentsImport(candidates) {
  return axiosClient.post('/import/admitted-students/confirm', { candidates }).then((res) => res.data);
}

export function previewRoomsPdf(file) {
  return axiosClient
    .post('/import/rooms/preview', pdfFormData(file), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function confirmRoomsImport(candidates) {
  return axiosClient.post('/import/rooms/confirm', { candidates }).then((res) => res.data);
}
