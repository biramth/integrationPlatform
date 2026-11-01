import axiosClient from './axiosClient';

export const RESET_CONFIRMATION_PHRASE = 'RESET PLATEFORME';

export function resetPlatform(confirmationPhrase) {
  return axiosClient.post('/platform/reset', { confirmationPhrase }).then((res) => res.data);
}

export function getStorageStatus() {
  return axiosClient.get('/platform/storage-status').then((res) => res.data);
}

export function migrateStorageToR2(deleteSource = false) {
  return axiosClient.post('/platform/migrate-storage-to-r2', { deleteSource }).then((res) => res.data);
}
