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
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  user: {
    list: '/api/user/list',
    details: (id: string | number) => `/api/user/${id}`,
  },
  friend: {
    list: '/api/friend/list',
    new: '/api/friend/new',
    inviteAccept: '/api/friend/invite/accept',
    details: (id: string | number) => `/api/friend/${id}`,
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
    read: '/api/mail/read',
    flags: '/api/mail/flags',
    send: '/api/mail/send',
    delete: (mailId: string | number) => `/api/mail/${mailId}`,
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
    sign: '/api/upload/sign',
  },
  album: {
    list: '/api/album/list',
    create: '/api/album/create',
    details: (id: string | number) => `/api/album/${id}`,
    update: (id: string | number) => `/api/album/${id}`,
    delete: (id: string | number) => `/api/album/${id}`,
    view: '/api/album/view',
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
    view: '/api/gift/view',
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
    view: '/api/collection-item/view',
  },
  coffeeShop: {
    list: '/api/coffee-shop/list',
    add: '/api/coffee-shop/new',
    details: (id: string | number) => `/api/coffee-shop/${id}`,
    update: (id: string | number) => `/api/coffee-shop/${id}`,
    delete: (id: string | number) => `/api/coffee-shop/${id}`,
    chat: (id: string | number) => `/api/coffee-shop/${id}/chat`,
    chatMessage: (id: string | number, messageId: string | number) =>
      `/api/coffee-shop/${id}/chat/${messageId}`,
    presence: (id: string | number) => `/api/coffee-shop/${id}/presence`,
    presenceMe: '/api/coffee-shop/presence',
    menu: (id: string | number) => `/api/coffee-shop/${id}/menu`,
    menuOrder: (id: string | number) => `/api/coffee-shop/${id}/menu/order`,
  },
  reaction: {
    root: '/api/reaction',
  },
  blog: {
    list: '/api/blog/list',
    latest: '/api/blog/latest',
    details: '/api/blog/details',
    search: '/api/blog/search',
    add: '/api/blog/new',
    update: (id: string | number) => `/api/blog/${id}`,
    delete: (id: string | number) => `/api/blog/${id}`,
    view: '/api/blog/view',
  },
  bookshelf: {
    introduce: {
      list: '/api/bookshelf/introduce/list',
      add: '/api/bookshelf/introduce/new',
      details: (id: string | number) => `/api/bookshelf/introduce/${id}`,
      update: (id: string | number) => `/api/bookshelf/introduce/${id}`,
      delete: (id: string | number) => `/api/bookshelf/introduce/${id}`,
    },
    ebook: {
      list: '/api/bookshelf/ebook/list',
      add: '/api/bookshelf/ebook/new',
      details: (id: string | number) => `/api/bookshelf/ebook/${id}`,
      update: (id: string | number) => `/api/bookshelf/ebook/${id}`,
      delete: (id: string | number) => `/api/bookshelf/ebook/${id}`,
    },
    audiobook: {
      list: '/api/bookshelf/audiobook/list',
      add: '/api/bookshelf/audiobook/new',
      details: (id: string | number) => `/api/bookshelf/audiobook/${id}`,
      update: (id: string | number) => `/api/bookshelf/audiobook/${id}`,
      delete: (id: string | number) => `/api/bookshelf/audiobook/${id}`,
    },
  },
  post: {
    list: '/api/post/list',
    latest: '/api/post/latest',
    details: '/api/post/details',
    search: '/api/post/search',
    add: '/api/post/new',
    comments: '/api/post/comment',
    view: '/api/post/view',
    update: (id: string | number) => `/api/post/${id}`,
    delete: (id: string | number) => `/api/post/${id}`,
  },
};
