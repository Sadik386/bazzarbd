export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export function getVoiceConnectEndpoint(): string {
  if (import.meta.env.VITE_VOICE_CONNECT_URL) {
    return import.meta.env.VITE_VOICE_CONNECT_URL;
  }
  if (API_URL.startsWith("http")) {
    return `${API_URL.replace(/\/$/, "")}/voice/connect`;
  }
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const protocol = isHttps ? "https:" : "http:";
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `${protocol}//${host}:5001/api/voice/connect`;
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.token) {
        setAccessToken(data.token);
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function fetchWithAuth(path: string, options: RequestInit = {}, isFormData = false): Promise<Response> {
  const buildHeaders = (token: string | null): HeadersInit => {
    const base: Record<string, string> = {};
    if (!isFormData) {
      base["Content-Type"] = "application/json";
    }
    if (token) {
      base["Authorization"] = `Bearer ${token}`;
    }
    if (options.headers && typeof options.headers === "object" && !Array.isArray(options.headers)) {
      Object.assign(base, options.headers as Record<string, string>);
    }
    return base;
  };

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: buildHeaders(accessToken),
  });

  const skipRefresh =
    path === "/auth/refresh-token" || path === "/auth/login" || path === "/auth/signup";

  if (res.status === 401 && !skipRefresh) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: buildHeaders(fresh),
      });
    }
  }

  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(path, options, false);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

async function requestUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetchWithAuth(path, { method: "POST", body: formData }, true);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Upload failed (${res.status})`);
  }
  return res.json();
}

async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const res = await fetchWithAuth(path, options, true);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Download failed (${res.status})`);
  }
  return res.blob();
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => requestUpload<T>(path, formData),
  getBlob: (path: string, options?: RequestInit) => requestBlob(path, options),
};
