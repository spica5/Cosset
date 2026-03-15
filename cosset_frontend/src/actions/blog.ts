import type { IBlogItem } from 'src/types/blog';

import { useCallback, useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const BLOG_LIST_ENDPOINT = endpoints.blog.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type BlogsData = {
  blogs?: IBlogItem[];
};

export function useGetBlogs(customerId?: string | number) {
  const url = customerId
    ? `${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`
    : BLOG_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<BlogsData>(url, fetcher, swrOptions);
  const refreshBlogs = useCallback(() => mutate(url), [url]);

  const memoizedValue = useMemo(() => {
    const blogs = data?.blogs || [];

    return {
      blogs,
      blogsLoading: isLoading,
      blogsError: error,
      blogsValidating: isValidating,
      blogsEmpty: !isLoading && !blogs.length,
      refreshBlogs,
    };
  }, [data?.blogs, error, isLoading, isValidating, refreshBlogs]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

type BlogData = {
  blog?: IBlogItem;
};

export function useGetBlog(blogId: string | number | '') {
  const url = blogId ? `${endpoints.blog.details}?id=${encodeURIComponent(String(blogId))}` : null;

  const { data, isLoading, error, isValidating } = useSWR<BlogData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      blog: data?.blog, 
      blogLoading: isLoading,
      blogError: error,
      blogValidating: isValidating,
    }),
    [data?.blog, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createBlog(blog: Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const data = { blog };
  const res = await axios.post(endpoints.blog.add, data);

  // Revalidate the blog list cache after creating a blog.
  mutate(BLOG_LIST_ENDPOINT);
  if (blog.customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(blog.customerId))}`);
  }

  return res.data;
}

// ----------------------------------------------------------------------

export async function updateBlog(
  blogId: string | number,
  updates: Partial<Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  const data = { blog: updates };
  const res = await axios.put(endpoints.blog.update(blogId), data);

  mutate(BLOG_LIST_ENDPOINT);
  if (updates.customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(updates.customerId))}`);
  }
  mutate(`${endpoints.blog.details}?id=${encodeURIComponent(String(blogId))}`);

  return res.data;
}

// ----------------------------------------------------------------------

export async function deleteBlog(
  blogId: string | number,
  customerId?: string | number,
) {
  const res = await axios.delete(endpoints.blog.delete(blogId));

  mutate(BLOG_LIST_ENDPOINT);
  if (customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`);
  }

  return res.data;
}
