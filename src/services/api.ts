// Unified API Fetch Client
// Automatically handles JWT tokens in headers, response parsing, and error normalization.

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  // Set headers
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  // Inject JWT authorization if present
  const token = localStorage.getItem('vocalize_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    
    // Auto-logout on unauthorized token responses
    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/signup') {
      localStorage.removeItem('vocalize_token');
      window.dispatchEvent(new Event('vocalize_logout'));
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Request failed. Please try again.');
    }

    return data as T;
  } catch (err: any) {
    console.error(`API Fetch Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body }),
  put: <T = any>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
