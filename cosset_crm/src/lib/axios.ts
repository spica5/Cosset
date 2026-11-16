import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

import { JWT_STORAGE_KEY } from 'src/auth/context/jwt/constant';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(JWT_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const rawData = error?.response?.data;
    const apiMessage =
      rawData?.message ||
      (typeof rawData === 'string' && !rawData.trim().startsWith('<') ? rawData : null);
    const message =
      apiMessage ||
      (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error'
        ? `Cannot reach Cosset API at ${CONFIG.serverUrl || '(missing NEXT_PUBLIC_SERVER_URL)'}. Is cosset_backend running?`
        : null) ||
      (status ? `Request failed (${status})` : null) ||
      error?.message ||
      'Something went wrong!';
    console.error('Axios error:', {
      message,
      status,
      url: error?.config?.baseURL
        ? `${error.config.baseURL}${error.config.url || ''}`
        : error?.config?.url,
    });
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args, {}];

    const res = await axiosInstance.get<T>(url, config);

    return res.data;
  } catch (error) {
    console.error('Fetcher failed:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/crm/sign-in',
    signUp: '/api/auth/sign-up',
  },
  user: {
    root: '/api/user',
    list: '/api/user/list',
    details: (id: string | number) => `/api/user/${id}`,
  },
  upload: {
    image: '/api/upload/image',
    file: '/api/upload/file',
    uploadUrl: '/api/upload-url',
    sign: '/api/upload/sign',
    multipart: '/api/upload/multipart',
    stream: '/api/upload/stream',
    delete: '/api/upload/image',
  },
  admin: {
    files: {
      root: '/api/admin/files',
      copyToR2: '/api/admin/files/copy-to-r2',
    },
    customers: {
      payments: '/api/admin/customers/payments',
      wallet: (id: string | number) => `/api/admin/customers/${id}/wallet`,
      billing: (id: string | number) => `/api/admin/customers/${id}/billing`,
    },
  },
  siteSettings: {
    introVideo: '/api/site-settings/intro-video',
  },
  cinema: {
    film: {
      list: '/api/cinema/film/list',
      add: '/api/cinema/film/new',
      details: (id: string | number) => `/api/cinema/film/${id}`,
      update: (id: string | number) => `/api/cinema/film/${id}`,
      delete: (id: string | number) => `/api/cinema/film/${id}`,
    },
    screening: {
      list: '/api/cinema/screening/list',
      add: '/api/cinema/screening/new',
      details: (id: string | number) => `/api/cinema/screening/${id}`,
      update: (id: string | number) => `/api/cinema/screening/${id}`,
      delete: (id: string | number) => `/api/cinema/screening/${id}`,
    },
    reservation: {
      list: '/api/cinema/reservation/list',
      add: '/api/cinema/reservation/new',
      details: (id: string | number) => `/api/cinema/reservation/${id}`,
      delete: (id: string | number) => `/api/cinema/reservation/${id}`,
    },
    notificationPrefs: '/api/cinema/notification-prefs',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
} as const;
