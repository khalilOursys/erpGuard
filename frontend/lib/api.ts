// src/lib/api.ts
type Json = any;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

export { API_BASE };

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'development') {
  console.warn('NEXT_PUBLIC_API_URL not set in .env.local. Using fallback: http://localhost:3001. Set it for production!');
}

class ApiError extends Error {
  public status: number;
  public body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const handleUnauthorized = () => {
  // central 401 handler
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // use location.href (server-side not applicable, this runs in browser)
  window.location.href = "/login";
};

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      return data;
    } catch (err) {
      // malformed json
      return null;
    }
  }
  // fallback: try text
  try {
    const text = await response.text();
    return text;
  } catch {
    return null;
  }
}

const api = {
  async request<T = Json>(url: string, opts: RequestInit = {}): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string> | undefined),
    };

    // if body is a plain object and not FormData, ensure JSON headers
    if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const finalUrl = `${API_BASE || ''}${url}`;
    console.log(`API Request: ${opts.method || 'GET'} ${finalUrl}`); // Debug log for easier troubleshooting

    const response = await fetch(finalUrl, {
      credentials: "include",
      ...opts,
      headers,
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiError("Unauthorized", 401, null);
    }

    const body = await parseResponse(response);

    if (!response.ok) {
      // throw structured error for callers / react-query
      throw new ApiError(
        (body && body.message) || response.statusText || "Request failed",
        response.status,
        body,
      );
    }

    return body as T;
  },

  // GET
  async get<T = Json>(url: string): Promise<T> {
    return this.request<T>(url, { method: "GET" });
  },

  // POST with JSON body or FormData
  async post<T = Json>(url: string, body?: any, p0?: { headers: { "Content-Type": string; }; }): Promise<T> {
    const payload = body && !(body instanceof FormData) ? JSON.stringify(body) : body;
    const opts: RequestInit = {
      method: "POST",
      body: payload,
    };
    // If FormData is used, allow content-type omission so browser sets boundary.
    if (body instanceof FormData) {
      // do not set Content-Type so boundary is included
      return this.request<T>(url, opts);
    }
    return this.request<T>(url, opts);
  },

  // PUT (JSON)
async put<T = Json>(url: string, body?: any): Promise<T> {
  const payload = body && !(body instanceof FormData) ? JSON.stringify(body) : body;
  return this.request<T>(url, {
    method: "PUT",
    body: payload,
  });
},

  // PATCH (JSON)
  async patch<T = Json>(url: string, body?: any): Promise<T> {
    const payload = body && !(body instanceof FormData) ? JSON.stringify(body) : body;
    return this.request<T>(url, {
      method: "PATCH",
      body: payload,
    });
  },

  // DELETE
  async delete<T = Json>(url: string): Promise<T> {
    return this.request<T>(url, { method: "DELETE" });
  },

  // Upload helper for multipart/form-data (returns parsed JSON)
  async upload<T = Json>(url: string, formData: FormData): Promise<T> {
    return this.post<T>(url, formData);
  },
};

export default api;
export { ApiError };
