interface ApiError {
  status: number;
  message: string;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.href = '/login';
    throw { status: 401, message: 'Unauthorized' } as ApiError;
  }

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Ignore JSON parse errors
    }
    throw { status: response.status, message } as ApiError;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (url: string) => apiFetch(url, { method: 'GET' }),
  post: (url: string, body?: any) =>
    apiFetch(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (url: string, body: any) =>
    apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url: string) => apiFetch(url, { method: 'DELETE' }),
};
