export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const fetchOptions = {
    ...options,
    credentials: "include" as const, // Allow sending/receiving cookies
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  };

  const res = await fetch(`${API_URL}${path}`, fetchOptions);

  if (res.status === 401 && path !== "/auth/refresh-token" && path !== "/auth/login") {
    // Attempt silent token refresh
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (refreshRes.ok) {
        const { token } = await refreshRes.json();
        setAccessToken(token);
        
        // Retry the original request with the new token
        const retryOptions = {
          ...fetchOptions,
          headers: {
            ...fetchOptions.headers,
            Authorization: `Bearer ${token}`,
          },
        };
        const retryRes = await fetch(`${API_URL}${path}`, retryOptions);
        if (retryRes.ok) {
          return retryRes.json();
        }
      }
    } catch (refreshErr) {
      console.error("Failed to silently refresh token:", refreshErr);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
