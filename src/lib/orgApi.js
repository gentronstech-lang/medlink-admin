import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const ORG_TOKEN_KEY = 'org_access_token';
export const ORG_ADMIN_KEY = 'org_admin_user';

const orgApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

orgApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ORG_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

orgApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(ORG_TOKEN_KEY);
      localStorage.removeItem(ORG_ADMIN_KEY);
      window.location.href = '/org/login';
    }
    return Promise.reject(err);
  }
);

export function getOrgPayload(res) {
  const d = res?.data;
  return d?.data !== undefined ? d.data : d;
}

export function getOrgErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message =
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors[0]?.message : undefined) ||
    err?.message;

  if (status === 409) return 'Already exists';
  if (status === 400) return message || 'Validation error';
  return message || 'Request failed';
}

export default orgApi;

