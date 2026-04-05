import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 🔐 Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔁 REFRESH CONTROL
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // ⏱ TIMEOUT
    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        message: "Server is taking too long. Try again.",
      });
    }

    // 🔥 IMPORTANT: ensure config exists
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 🔐 HANDLE 401
    if (error.response && error.response.status === 401) {

      // ❌ prevent infinite loop
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // 🔁 QUEUE if refresh in progress
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = "Bearer " + token;
              resolve(api(originalRequest));
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔥 Refresh triggered");

        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = res.data.data.accessToken;
        const newRefreshToken = res.data.data.refreshToken;

        // ✅ SAVE
        localStorage.setItem("token", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // ✅ update default header
        api.defaults.headers.common["Authorization"] =
          "Bearer " + newAccessToken;

        processQueue(null, newAccessToken);

        // 🔁 retry original
        originalRequest.headers.Authorization = "Bearer " + newAccessToken;

        return api(originalRequest);

      } catch (err) {
        console.warn("🔐 Refresh failed → logout");

        processQueue(err, null);

        localStorage.clear();
        window.location.href = "/login";

        return Promise.reject(err);

      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);