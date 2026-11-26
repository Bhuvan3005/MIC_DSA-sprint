import axios from 'axios';
import api from './api';

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== '' && v != null);
  return p.length ? `?${new URLSearchParams(p).toString()}` : '';
};

export const authApi = {
  register: (b) => api.post('/auth/register', b),
  login: (b) => api.post('/auth/login', b),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgot: (b) => api.post('/auth/forgot-password', b),
  reset: (b) => api.post('/auth/reset-password', b),
  changePassword: (b) => api.post('/auth/change-password', b),
};

export const userApi = {
  update: (b) => api.put('/users/me', b),
  dashboard: () => api.get('/users/me/dashboard'),
  heatmap: () => api.get('/users/me/heatmap'),
  achievements: () => api.get('/users/me/achievements'),
  setAvatar: (image) => api.put('/users/me/avatar', { image }),
  removeAvatar: () => api.delete('/users/me/avatar'),
  profile: (id) => api.get(`/users/${id}`),
};

export const challengeApi = {
  today: () => api.get('/challenges/today'),
  history: (p) => api.get(`/challenges/history${qs(p)}`),
  byDate: (date) => api.get(`/challenges/${date}`),
  complete: (questionId) => api.post('/completions', { questionId }),
};

export const leaderboardApi = {
  board: (tab, p) => api.get(`/leaderboard/${tab}${qs(p)}`),
  colleges: () => api.get('/leaderboard/colleges'),
};

export const videoApi = {
  list: (p) => api.get(`/videos${qs(p)}`),
  get: (id) => api.get(`/videos/${id}`),
};

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  analytics: (days) => api.get(`/admin/analytics${qs({ days })}`),
  questions: (p) => api.get(`/admin/questions${qs(p)}`),
  createQuestion: (b) => api.post('/admin/questions', b),
  updateQuestion: (id, b) => api.put(`/admin/questions/${id}`, b),
  deleteQuestion: (id) => api.delete(`/admin/questions/${id}`),
  toggleFeatured: (id) => api.patch(`/admin/questions/${id}/featured`),
  challenges: (p) => api.get(`/admin/challenges${qs(p)}`),
  createChallenge: (b) => api.post('/admin/challenges', b),
  updateChallenge: (id, b) => api.put(`/admin/challenges/${id}`, b),
  deleteChallenge: (id) => api.delete(`/admin/challenges/${id}`),
  previewChallenge: (id) => api.get(`/admin/challenges/${id}/preview`),
  videos: (p) => api.get(`/admin/videos${qs(p)}`),
  videoConfig: () => api.get('/admin/videos/config'),
  videoSignature: () => api.post('/admin/videos/signature'),
  createVideo: (b) => api.post('/admin/videos', b),
  updateVideo: (id, b) => api.put(`/admin/videos/${id}`, b),
  publishVideo: (id, published) => api.patch(`/admin/videos/${id}/publish`, { published }),
  deleteVideo: (id) => api.delete(`/admin/videos/${id}`),
  students: (p) => api.get(`/admin/students${qs(p)}`),
  setStatus: (id, status) => api.put(`/admin/students/${id}/status`, { status }),
  setRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  settings: () => api.get('/admin/settings'),
  saveSettings: (b) => api.put('/admin/settings', b),
  leaderboardStats: () => api.get('/admin/leaderboard/stats'),
  competitions: () => api.get('/admin/competitions'),
  resetCompetition: (type) => api.post('/admin/competitions/reset', { type }),
  completions: (p) => api.get(`/admin/completions${qs(p)}`),
  voidCompletion: (id, reason) => api.post(`/admin/completions/${id}/void`, { reason }),
};

/**
 * Direct-to-Cloudinary upload using a server-signed request. Reports progress and supports abort.
 * The API secret never reaches the browser: only the short-lived signature does.
 */
export function uploadToCloudinary(file, sig, { onProgress, signal } = {}) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', sig.timestamp);
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('allowed_formats', sig.allowedFormats);
  return axios.post(sig.uploadUrl, form, {
    signal,
    timeout: 0,
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  }).then((r) => r.data).catch((e) => {
    if (axios.isCancel(e)) throw new Error('Upload cancelled');
    throw new Error(e.response?.data?.error?.message || 'Upload to Cloudinary failed');
  });
}
