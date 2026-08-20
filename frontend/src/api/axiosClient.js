import axios from 'axios';

// En développement, Vite proxifie /api vers le backend local (vite.config.js).
// En production le frontend est sur Vercel et l'API sur Render : VITE_API_URL
// porte l'origine du backend (ex: https://integration-dut1.onrender.com).
const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const baseURL = apiUrl ? `${apiUrl}/api` : '/api';

const axiosClient = axios.create({ baseURL });

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;
export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
