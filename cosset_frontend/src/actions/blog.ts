import type { IBlogItem } from 'src/types/blog';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axios, { fetcher, endpoints } from 'src/utils/axios';

// ----------------------------------------------------------------------

const BLOG_LIST_ENDPOINT = endpoints.post.list;

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type BlogsData = {
  blogs?: IBlogItem[];
  posts?: IBlogItem[];
};

export function useGetBlogs(customerId?: string | number) {
  const url = customerId
    ? `${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(customerId))}`
    : BLOG_LIST_ENDPOINT;

  const { data, isLoading, error, isValidating } = useSWR<BlogsData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(() => {
    const blogs = data?.blogs || data?.posts || [];

    return {
      blogs,
      blogsLoading: isLoading,
      blogsError: error,
      blogsValidating: isValidating,
      blogsEmpty: !isLoading && !blogs.length,
    };
  }, [data?.blogs, data?.posts, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

type BlogData = {
  blog?: IBlogItem;
  post?: IBlogItem;
};

export function useGetBlog(blogId: string | number | '') {
  const url = blogId ? `${endpoints.post.details}?id=${encodeURIComponent(String(blogId))}` : null;

  const { data, isLoading, error, isValidating } = useSWR<BlogData>(url, fetcher, swrOptions);

  const memoizedValue = useMemo(
    () => ({
      blog: data?.blog || data?.post,
      blogLoading: isLoading,
      blogError: error,
      blogValidating: isValidating,
    }),
    [data?.blog, data?.post, error, isLoading, isValidating],
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createBlog(blog: Omit<IBlogItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const data = { blog };
  const res = await axios.post(endpoints.post.add, data);

  // Revalidate the post list cache after creating a blog.
  mutate(BLOG_LIST_ENDPOINT);
  if (blog.customerId) {
    mutate(`${BLOG_LIST_ENDPOINT}?customerId=${encodeURIComponent(String(blog.customerId))}`);
  }

  return res.data;
}
