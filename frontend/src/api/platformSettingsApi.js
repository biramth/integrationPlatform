import axiosClient from './axiosClient';

export function getPlatformSettings() {
  return axiosClient.get('/platform-settings').then((res) => res.data.settings);
}

export function updatePlatformSetting(key, enabled) {
  return axiosClient.put(`/platform-settings/${key}`, { enabled }).then((res) => res.data.settings);
}
