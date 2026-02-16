import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

// frontend/src/lib/api.ts
api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
  
      if (err.response?.status === 401 && !original._retry) {
        if (original.url.includes("/auth/login") || original.url.includes("/auth/refresh")) {
          return Promise.reject(err);
        }
  
        original._retry = true;
        try {
          await axios.post("http://127.0.0.1:8000/api/auth/refresh/", {}, { withCredentials: true });
          return api(original);
        } catch (e) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(err);
    }
  );

  export default api;