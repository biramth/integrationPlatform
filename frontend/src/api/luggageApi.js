import axiosClient from './axiosClient';

export function uploadLuggagePhoto(dut1Id, file) {
  const formData = new FormData();
  formData.append('photo', file);
  return axiosClient
    .post(`/dut1/${dut1Id}/luggage-photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function listLuggagePhotos(dut1Id) {
  return axiosClient.get(`/dut1/${dut1Id}/luggage-photos`).then((res) => res.data);
}

export function deleteLuggagePhoto(photoId) {
  return axiosClient.delete(`/luggage-photos/${photoId}`).then((res) => res.data);
}
