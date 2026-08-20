import axiosClient from './axiosClient';

export const RESET_CONFIRMATION_PHRASE = 'RESET PLATEFORME';

export function resetPlatform(confirmationPhrase) {
  return axiosClient.post('/platform/reset', { confirmationPhrase }).then((res) => res.data);
}
