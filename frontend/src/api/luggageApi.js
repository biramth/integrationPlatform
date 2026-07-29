import axiosClient from './axiosClient';

export function setLuggageCount(dut1Id, luggageCount) {
  return axiosClient.put(`/dut1/${dut1Id}/luggage-count`, { luggageCount }).then((res) => res.data);
}

export function createLuggageItem(dut1Id, file, isSensitive, sensitiveNote) {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('isSensitive', isSensitive ? 'true' : 'false');
  if (sensitiveNote) formData.append('sensitiveNote', sensitiveNote);
  return axiosClient
    .post(`/dut1/${dut1Id}/luggage-items`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

export function listLuggageItems(dut1Id) {
  return axiosClient.get(`/dut1/${dut1Id}/luggage-items`).then((res) => res.data);
}

export function deleteLuggageItem(itemId) {
  return axiosClient.delete(`/luggage-items/${itemId}`).then((res) => res.data);
}
