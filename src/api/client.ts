import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// Attach the Supabase access token. Race against a 5s timeout so a hanging
// token-refresh never freezes the request indefinitely.
apiClient.interceptors.request.use(async (config) => {
  try {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
    const result = await Promise.race([supabase.auth.getSession(), timeout]);
    if (result) {
      const session = (result as any).data?.session;
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
  } catch {
    // proceed without auth header; backend will return 401
  }
  return config;
}, (error) => Promise.reject(error));

// On 401, force-refresh the session so the next retry gets a fresh token.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Fire-and-forget: don't await so a slow refresh never delays the caller.
      supabase.auth.refreshSession().catch(() => {});
    }
    return Promise.reject(error);
  }
);

// Payment service client — same JWT auth, port 4001
export const paymentClient = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_SERVICE_URL ?? 'http://localhost:4001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

paymentClient.interceptors.request.use(async (config) => {
  try {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
    const result  = await Promise.race([supabase.auth.getSession(), timeout]);
    if (result) {
      const session = (result as any).data?.session;
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }
  } catch {}
  return config;
}, (error) => Promise.reject(error));
