import axios from "axios";

const API_BASE = typeof window !== "undefined"
  ? "http://localhost:8000/api"
  : "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (original.url?.includes("/auth/login") || original.url?.includes("/auth/refresh")) {
        return Promise.reject(err);
      }
      original._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh/`, {}, { withCredentials: true });
        return api(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

  export default api;