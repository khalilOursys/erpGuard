const api = {
  get: async (url: string) => {
    const token = localStorage.getItem("token");
    console.log("API Get - Token:", token); // Debug token
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensure cookies are sent if used
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    const data = await response.json();
    console.log("API Get - Response:", data); // Debug response
    return data;
  },
  post: async (url: string, body?: any) => {
    const token = localStorage.getItem("token");
    console.log("API Post - Token:", token); // Debug token
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    return response.json();
  },
  put: async (url: string, body: any) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      credentials: "include",
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    return response.json();
  },
  delete: async (url: string) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    return response.json();
  },
};

export default api;