import axios from 'axios';

// Vercel/production builds must set VITE_API_BASE_URL. Local dev: .env → http://localhost:3000
const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.medlink-africa.com';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Bearer token & content-type handling
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // If we're sending FormData, let the browser set multipart boundaries
    if (config.data instanceof FormData) {
        if (config.headers && config.headers['Content-Type']) {
            delete config.headers['Content-Type'];
        }
    }

    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('admin_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

/** Get payload - handles both direct and nested { data: {...} } response */
export function getPayload(res) {
    const d = res?.data;
    return d?.data !== undefined ? d.data : d;
}

export default api;
