// src/lib/api.ts
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── API methods ───────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (data: { name: string; email: string; password: string; orgName: string }) =>
    api.post("/auth/register", data).then((r) => r.data),
};

export const workflows = {
  list: () => api.get("/workflows").then((r) => r.data),
  get: (id: string) => api.get(`/workflows/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/workflows", data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/workflows/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
};

export const executions = {
  list: (params?: { workflowId?: string; status?: string; limit?: number }) =>
    api.get("/executions", { params }).then((r) => r.data),
  get: (id: string) => api.get(`/executions/${id}`).then((r) => r.data),
};

export const analytics = {
  overview: (days = 7) => api.get("/analytics/overview", { params: { days } }).then((r) => r.data),
  timeseries: (days = 7) => api.get("/analytics/timeseries", { params: { days } }).then((r) => r.data),
};

export const alerts = {
  list: (params?: { status?: string; severity?: string }) =>
    api.get("/alerts", { params }).then((r) => r.data),
  acknowledge: (id: string) => api.patch(`/alerts/${id}/acknowledge`).then((r) => r.data),
  resolve: (id: string) => api.patch(`/alerts/${id}/resolve`).then((r) => r.data),
};

export const aiApi = {
  analyze: (executionId: string) =>
    api.post(`/ai/analyze/${executionId}`).then((r) => r.data),
  autoHeal: (executionId: string) =>
    api.post(`/ai/auto-heal/${executionId}`).then((r) => r.data),
  predict: (workflowId: string) =>
    api.get(`/ai/predict/${workflowId}`).then((r) => r.data),
  chat: (message: string, context?: any, history?: any[]) =>
    api.post("/ai/chat", { message, context, history }).then((r) => r.data),
};

export const apiKeys = {
  list: () => api.get("/api-keys").then((r) => r.data),
  create: (name: string) => api.post("/api-keys", { name }).then((r) => r.data),
  delete: (id: string) => api.delete(`/api-keys/${id}`),
};
