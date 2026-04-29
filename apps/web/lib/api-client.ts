import axios from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens, setUserState } from './auth-storage';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error?.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      const res = await api.post('/api/v1/auth/refresh', { refreshToken });
      const payload = res.data.data ?? res.data;
      setTokens(payload.accessToken, payload.refreshToken);
      setUserState(payload.user, payload.store);
      resolveQueue(payload.accessToken);
      original.headers.Authorization = `Bearer ${payload.accessToken}`;
      return api(original);
    } catch (e) {
      clearTokens();
      resolveQueue(null);
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;