import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  withCredentials: true, // JWT lives in an HTTP-only cookie, never in JS-accessible storage
  headers: { 'X-Requested-With': 'codesprint' },
  timeout: 30000,
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (r) => r.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const err = new Error(data?.message || (error.code === 'ECONNABORTED' ? 'Request timed out' : status ? 'Something went wrong' : 'Cannot reach the server'));
    err.status = status; err.code = data?.code; err.details = data?.details;
    if (status === 401 && data?.code === 'UNAUTHENTICATED' && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  },
);

export default api;
