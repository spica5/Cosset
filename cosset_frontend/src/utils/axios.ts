import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.serverUrl });

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong!')
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
  },
  user: {
    list: '/api/user/list',
    details: (id: string | number) => `/api/user/${id}`,
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  notification: {
    list: '/api/notification/list',
    new: '/api/notification/new',
    details: (id: string | number) => `/api/notification/${id}`,
  },
  guestArea: {
    root: '/api/guest-area',
    details: (customerId: string | number) => `/api/guest-area/${customerId}`,
  },
  designSpace: {
    root: '/api/design-space',
  },
  upload: {
    image: '/api/upload/image',
  },
  album: {
    list: '/api/album/list',
    create: '/api/album/create',
    details: (id: string | number) => `/api/album/${id}`,
    update: (id: string | number) => `/api/album/${id}`,
    delete: (id: string | number) => `/api/album/${id}`,
    images: {
      list: (id: string | number) => `/api/album/${id}/images`,
      upload: (id: string | number) => `/api/album/${id}/images`,
      delete: (id: string | number, imageId: string) => `/api/album/${id}/images/${imageId}`,
    },
  },
  gift: {
    list: '/api/gift/list',
    count: '/api/gift/count',
    add: '/api/gift/new',
    update: (id: string | number) => `/api/gift/${id}`,
    delete: (id: string | number) => `/api/gift/${id}`,
    details: (id: string | number) => `/api/gift/${id}`,
  },
  collection: {
    list: '/api/collection/list',
    add: '/api/collection/new',
    update: (id: string | number) => `/api/collection/${id}`,
    delete: (id: string | number) => `/api/collection/${id}`,
    details: (id: string | number) => `/api/collection/${id}`,
  },
  collectionItem: {
    list: '/api/collection-item/list',
    add: '/api/collection-item/new',
    update: (id: string | number) => `/api/collection-item/${id}`,
    delete: (id: string | number) => `/api/collection-item/${id}`,
    details: (id: string | number) => `/api/collection-item/${id}`,
  },
  post: {
    list: '/api/post/list',
    latest: '/api/post/latest',
    details: '/api/post/details',
    search: '/api/post/search',
    add: '/api/post/new',
  },
};
