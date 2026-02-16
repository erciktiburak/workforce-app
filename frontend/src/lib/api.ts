import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

const getAccess = () => (typeof window !== "undefined" ? localStorage.getItem("access") : null);
const getRefresh = () => (typeof window !== "undefined" ? localStorage.getItem("refresh") : null);

export const setAuthToken = (token: string) => {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

if (typeof window !== "undefined") {
  const access = getAccess();
  if (access) setAuthToken(access);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh = getRefresh();
      if (!refresh) {
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          "http://127.0.0.1:8000/api/auth/token/refresh/",
          { refresh },
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        setAuthToken(newAccess);

        original.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;